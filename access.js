import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { collection, doc, onSnapshot, runTransaction, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { driveUploadSettings } from "./firebase-config.js";

export const adminEmail = "tr7129.fitness@gmail.com";
let auth;
let approved = false;
let generation = 0;
let stopMember;
let stopRequests;
let accessChanged;
const gate = document.querySelector("#accessGate");
const message = document.querySelector("#accessMessage");
const account = document.querySelector("#accessAccount");
const login = document.querySelector("#loginButton");
const logout = document.querySelector("#gateLogout");
const adminPanel = document.querySelector("#approvalPanel");
const requests = document.querySelector("#approvalList");

export async function initializeAccess(app, db, onChange) {
  auth = getAuth(app);
  auth.languageCode = "ja";
  accessChanged = onChange;
  login.disabled = false;
  login.addEventListener("click", async () => {
    login.disabled = true;
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (error) {
      message.textContent = error.code === "auth/popup-blocked"
        ? "ポップアップを許可して、もう一度ログインしてください。"
        : "ログインできませんでした。もう一度お試しください。";
    } finally {
      login.disabled = false;
    }
  });
  logout.addEventListener("click", () => signOut(auth));
  document.querySelector("#authButton").addEventListener("click", () => signOut(auth));

  onAuthStateChanged(auth, async (user) => {
    const current = ++generation;
    stopMember?.();
    stopRequests?.();
    requests.replaceChildren();
    adminPanel.hidden = true;
    setAccess(false, user);
    login.hidden = !!user;
    logout.hidden = !user;
    account.textContent = user?.email || "";
    message.textContent = user ? "利用登録を確認しています…" : "Googleアカウントでログイン";
    if (!user) return;
    if (!user.emailVerified) {
      message.textContent = "メール確認済みのGoogleアカウントをご利用ください。";
      return;
    }
    if (user.email === adminEmail) {
      setAccess(true, user);
      adminPanel.hidden = false;
      stopRequests = onSnapshot(collection(db, "members"), (snapshot) => {
        if (current !== generation) return;
        renderRequests(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })), db);
      }, () => { requests.textContent = "利用申請の取得に失敗しました。再ログインしてください。"; });
      return;
    }
    const memberRef = doc(db, "members", user.uid);
    try {
      await runTransaction(db, async (transaction) => {
        const existing = await transaction.get(memberRef);
        if (!existing.exists()) transaction.set(memberRef, {
          email: user.email,
          name: user.displayName || "",
          status: "pending",
          requestedAt: serverTimestamp(),
        });
      });
      if (current !== generation) return;
      stopMember = onSnapshot(memberRef, (snapshot) => {
        if (current !== generation) return;
        const status = snapshot.data()?.status;
        setAccess(status === "approved", user);
        message.textContent = status === "revoked" ? "利用が停止されています。管理者にご確認ください。" : "利用申請を受け付けました。管理者の承認をお待ちください。";
      }, () => {
        if (current !== generation) return;
        setAccess(false, user);
        message.textContent = "利用権限を確認できません。再ログインしてください。";
      });
    } catch (error) {
      if (current !== generation) return;
      message.textContent = "利用申請を登録できませんでした。再ログインしてください。";
    }
  });
}

function setAccess(value, user) {
  approved = value;
  gate.hidden = value;
  document.querySelector("#appContent").hidden = !value;
  document.querySelector("#authStatus").textContent = user?.email || "";
  document.querySelector("#authButton").textContent = "ログアウト";
  document.querySelector("#authButton").disabled = false;
  accessChanged?.(value, user);
}

function renderRequests(items, db) {
  requests.replaceChildren();
  if (!items.length) { requests.textContent = "利用申請はありません。"; return; }
  const labels = { pending: "承認待ち", approved: "利用中", revoked: "停止中" };
  items.sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1));
  for (const item of items) {
    const row = document.createElement("div");
    row.className = "approval-row";
    const label = document.createElement("span");
    label.textContent = [item.name, item.email, labels[item.status] || "未承認"].filter(Boolean).join(" / ");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost-button";
    button.textContent = item.status === "approved" ? "利用停止" : "承認";
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await updateDoc(doc(db, "members", item.id), {
          status: item.status === "approved" ? "revoked" : "approved",
          reviewedAt: serverTimestamp(),
        });
      } catch (_) {
        button.disabled = false;
        label.textContent += "（更新失敗。再度お試しください）";
      }
    });
    row.append(label, button);
    requests.append(row);
  }
}

export function requireApprovedUser() {
  if (!approved || !auth?.currentUser) throw new Error("承認済みのGoogleアカウントでログインしてください。");
  return auth.currentUser;
}

export async function driveRequest(payload) {
  const user = requireApprovedUser();
  const idToken = await user.getIdToken();
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.name = "drive-" + requestId;
    frame.hidden = true;
    const form = document.createElement("form");
    form.method = "POST";
    form.action = driveUploadSettings.endpoint;
    form.target = frame.name;
    form.hidden = true;
    const finish = (error, data) => {
      clearTimeout(timer);
      window.removeEventListener("message", receive);
      frame.remove();
      form.remove();
      if (error) reject(error); else resolve(data);
    };
    const receive = (event) => {
      if (!/^https:\/\/(?:[a-z0-9-]+[.-])?script\.googleusercontent\.com$/.test(event.origin)) return;
      if (event.data?.requestId !== requestId) return;
      if (event.data.ok) finish(null, event.data.data);
      else finish(new Error(event.data.error || "料金表の処理に失敗しました。"));
    };
    const timer = setTimeout(() => finish(new Error("処理が時間切れになりました。再度お試しください。")), 120000);
    window.addEventListener("message", receive);
    for (const [name, value] of Object.entries({ ...payload, request_id: requestId, firebase_id_token: idToken, origin: location.origin })) {
      const input = document.createElement("input");
      input.type = "hidden"; input.name = name; input.value = value;
      form.append(input);
    }
    document.body.append(frame, form);
    form.submit();
  });
}
