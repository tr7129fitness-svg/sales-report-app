import { firebaseConfig, hasFirebaseConfig } from "./firebase-config.js";

const members = ["谷本", "會川", "上原", "ベイ"];
const feeItems = [
  "3h",
  "4h",
  "5h",
  "3h(evening)",
  "9h",
  "9h(上棟)",
  "夜勤3h",
  "夜勤4h",
  "夜勤9h",
  "トラック（平）",
  "トラック（ユニック）",
];
const storageKey = "sales-report-app-v2";
const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
const feeMinAmount = 10000;
const feeMaxAmount = 40000;
const feeStepAmount = 500;

const state = {
  cursor: new Date(),
  member: "all",
  query: "",
  reports: [],
  unsubscribe: null,
  storeMode: "local",
};

const el = {
  homeView: document.querySelector("#homeView"),
  formView: document.querySelector("#formView"),
  openForm: document.querySelector("#openForm"),
  backHome: document.querySelector("#backHome"),
  formTitle: document.querySelector("#formTitle"),
  syncStatus: document.querySelector("#syncStatus"),
  calendar: document.querySelector("#calendar"),
  currentMonth: document.querySelector("#currentMonth"),
  searchInput: document.querySelector("#searchInput"),
  clearSearch: document.querySelector("#clearSearch"),
  searchResults: document.querySelector("#searchResults"),
  searchResultList: document.querySelector("#searchResultList"),
  emptyMessage: document.querySelector("#emptyMessage"),
  form: document.querySelector("#reportForm"),
  editingId: document.querySelector("#editingId"),
  date: document.querySelector("#date"),
  member: document.querySelector("#member"),
  company: document.querySelector("#company"),
  contact: document.querySelector("#contact"),
  feeGrid: document.querySelector("#feeGrid"),
  note: document.querySelector("#note"),
  submitButton: document.querySelector("#submitButton"),
  clearForm: document.querySelector("#clearForm"),
  resetDemo: document.querySelector("#resetDemo"),
  prevMonth: document.querySelector("#prevMonth"),
  nextMonth: document.querySelector("#nextMonth"),
  filters: document.querySelectorAll(".member-filter"),
  dialog: document.querySelector("#detailDialog"),
  dialogTitle: document.querySelector("#dialogTitle"),
  dialogBody: document.querySelector("#dialogBody"),
  closeDialog: document.querySelector("#closeDialog"),
};

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatYen(value) {
  return Number(value).toLocaleString("ja-JP");
}

function buildFeeOptions() {
  const options = ['<option value="none">なし</option>'];
  for (let amount = feeMinAmount; amount <= feeMaxAmount; amount += feeStepAmount) {
    options.push(`<option value="${amount}">${formatYen(amount)}円</option>`);
  }
  return options.join("");
}

function renderFeeInputs() {
  el.feeGrid.innerHTML = feeItems
    .map(
      (item) => `
        <label class="fee-field">
          <span>${escapeHtml(item)}</span>
          <select data-fee-item="${escapeHtml(item)}">${buildFeeOptions()}</select>
        </label>
      `,
    )
    .join("");
}

async function loadReports() {
  if (hasFirebaseConfig()) {
    try {
      await connectFirestore();
      return;
    } catch (error) {
      console.error("Firebase connection failed. Falling back to localStorage.", error);
      el.syncStatus.textContent = "保存先: この端末（Firebase接続失敗）";
    }
  } else {
    el.syncStatus.textContent = "保存先: この端末（Firebase未設定）";
  }

  const saved = localStorage.getItem(storageKey);
  state.reports = saved ? JSON.parse(saved) : createDemoReports();
  persistReports();
  renderCalendar();
}

function persistReports() {
  if (state.storeMode === "firebase") return;
  localStorage.setItem(storageKey, JSON.stringify(state.reports));
}

async function connectFirestore() {
  const firebase = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const firestore = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
  const app = firebase.initializeApp(firebaseConfig);
  const db = firestore.getFirestore(app);
  const collectionRef = firestore.collection(db, "reports");

  state.storeMode = "firebase";
  state.firestore = firestore;
  state.collectionRef = collectionRef;
  el.syncStatus.textContent = "保存先: Firebase共有保存";

  state.unsubscribe = firestore.onSnapshot(
    firestore.query(collectionRef, firestore.orderBy("date", "asc")),
    (snapshot) => {
      state.reports = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderCalendar();
    },
    (error) => {
      console.error("Firestore snapshot failed.", error);
      el.syncStatus.textContent = "保存先: Firebase共有保存（読み込みエラー）";
    },
  );
}

function createDemoReports() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  return [
    {
      id: crypto.randomUUID(),
      date: toDateKey(new Date(year, month, 3)),
      member: "谷本",
      company: "株式会社アオイ商事",
      contact: "森田様",
      fees: { "3h": 4500, "トラック（平）": "none" },
      note: "課題感は明確。来週、基本料金での導入範囲を再確認する。",
    },
    {
      id: crypto.randomUUID(),
      date: toDateKey(new Date(year, month, 8)),
      member: "會川",
      company: "東都設備株式会社",
      contact: "川端様",
      fees: { "4h": 6000, "夜勤4h": 8000 },
      note: "予算承認待ち。担当者の温度感は高く、稟議資料が必要。",
    },
    {
      id: crypto.randomUUID(),
      date: toDateKey(new Date(year, month, 12)),
      member: "上原",
      company: "ミライ物流",
      contact: "中村様",
      fees: { "9h": 12000 },
      note: "現場利用者の確認が次の山。デモ環境を用意する。",
    },
    {
      id: crypto.randomUUID(),
      date: toDateKey(new Date(year, month, 18)),
      member: "ベイ",
      company: "北浜食品",
      contact: "大野様",
      fees: { "夜勤9h": 15000, "トラック（ユニック）": 5000 },
      note: "複数拠点で検討。決裁者同席の商談を設定済み。",
    },
  ];
}

function getVisibleReports() {
  const selectedMonth = monthKey(state.cursor);
  const query = normalizeText(state.query);
  return state.reports.filter((report) => {
    const isMonth = report.date.startsWith(selectedMonth);
    const isMember = state.member === "all" || report.member === state.member;
    const isSearchMatch = !query || searchableText(report).includes(query);
    return isMonth && isMember && isSearchMatch;
  });
}

function normalizeText(value) {
  return String(value).toLowerCase().replace(/\s+/g, "");
}

function searchableText(report) {
  return normalizeText(
    [
      report.date,
      report.member,
      report.company,
      report.contact,
      report.note,
      feeSummary(report.fees),
    ].join(" "),
  );
}

function renderCalendar() {
  const year = state.cursor.getFullYear();
  const month = state.cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(year, month, 1 - firstDay.getDay());
  const visibleReports = getVisibleReports();

  el.currentMonth.textContent = `${year}年 ${month + 1}月`;
  el.emptyMessage.hidden = visibleReports.length > 0;
  renderSearchResults(visibleReports);
  el.calendar.innerHTML = "";

  weekdays.forEach((weekday) => {
    const node = document.createElement("div");
    node.className = "weekday";
    node.textContent = weekday;
    el.calendar.append(node);
  });

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateKey = toDateKey(date);
    const dayReports = visibleReports.filter((report) => report.date === dateKey);
    const cell = document.createElement("section");
    cell.className = `day-cell${date.getMonth() === month ? "" : " outside"}`;

    const dateRow = document.createElement("div");
    dateRow.className = "date-row";
    dateRow.innerHTML = `<span class="date-number">${date.getDate()}</span>`;

    if (dayReports.length > 0) {
      const count = document.createElement("span");
      count.className = "report-count";
      count.textContent = dayReports.length;
      dateRow.append(count);
    }

    cell.append(dateRow);

    dayReports.forEach((report) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "report-card";
      card.dataset.member = report.member;
      card.innerHTML = `<strong>${escapeHtml(report.company)}</strong><span>${escapeHtml(report.member)} / ${escapeHtml(report.contact)}</span>`;
      card.addEventListener("click", () => openDetail(report.id));
      cell.append(card);
    });

    el.calendar.append(cell);
  }
}

function renderSearchResults(reports) {
  const isSearching = state.query.trim().length > 0;
  el.searchResults.hidden = !isSearching || reports.length === 0;
  el.searchResultList.innerHTML = "";

  if (!isSearching || reports.length === 0) return;

  reports
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((report) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "result-item";
      button.innerHTML = `
        <strong>${escapeHtml(report.date)}　${escapeHtml(report.company)}</strong>
        <span>${escapeHtml(report.member)} / ${escapeHtml(report.contact)} / ${escapeHtml(feeSummary(report.fees))}</span>
      `;
      button.addEventListener("click", () => openDetail(report.id));
      item.append(button);
      el.searchResultList.append(item);
    });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}

function feeSummary(fees = {}) {
  const selected = feeItems
    .map((item) => ({ item, amount: fees[item] }))
    .filter(({ amount }) => amount && amount !== "none");

  if (selected.length === 0) return "なし";
  return selected.map(({ item, amount }) => `${item}: ${formatYen(amount)}円`).join(" / ");
}

function openDetail(id) {
  const report = state.reports.find((item) => item.id === id);
  if (!report) return;

  el.dialogTitle.textContent = `${report.company} / ${report.member}`;
  el.dialogBody.innerHTML = `
    <div class="detail-row"><span>日付</span><strong>${escapeHtml(report.date)}</strong></div>
    <div class="detail-row"><span>営業担当</span><strong>${escapeHtml(report.member)}</strong></div>
    <div class="detail-row"><span>会社名</span><strong>${escapeHtml(report.company)}</strong></div>
    <div class="detail-row"><span>担当者名</span><strong>${escapeHtml(report.contact)}</strong></div>
    <div class="detail-row"><span>料金内容</span><strong>${escapeHtml(feeSummary(report.fees))}</strong></div>
    <div class="detail-row"><span>営業の所感</span><p>${escapeHtml(report.note)}</p></div>
    <div class="detail-actions">
      <button class="ghost-button" type="button" data-action="edit">編集</button>
      <button class="danger-button" type="button" data-action="delete">削除</button>
    </div>
  `;

  el.dialogBody.querySelector('[data-action="edit"]').addEventListener("click", () => {
    fillForm(report);
    el.dialog.close();
    showView("form");
  });
  el.dialogBody.querySelector('[data-action="delete"]').addEventListener("click", () => {
    deleteReport(report.id);
    el.dialog.close();
  });
  el.dialog.showModal();
}

function collectFees() {
  const fees = {};
  el.feeGrid.querySelectorAll("select[data-fee-item]").forEach((select) => {
    const value = select.value === "none" ? "none" : Number(select.value);
    fees[select.dataset.feeItem] = value;
  });
  return fees;
}

function setFees(fees = {}) {
  el.feeGrid.querySelectorAll("select[data-fee-item]").forEach((select) => {
    const value = fees[select.dataset.feeItem] ?? "none";
    select.value = String(value);
  });
}

function fillForm(report) {
  el.editingId.value = report.id;
  el.date.value = report.date;
  el.member.value = members.includes(report.member) ? report.member : members[0];
  el.company.value = report.company;
  el.contact.value = report.contact;
  setFees(report.fees);
  el.note.value = report.note;
  el.formTitle.textContent = "報告編集";
  el.submitButton.textContent = "更新";
  el.company.focus();
}

function clearForm() {
  el.form.reset();
  el.date.value = toDateKey(new Date());
  el.editingId.value = "";
  setFees();
  el.formTitle.textContent = "報告入力";
  el.submitButton.textContent = "保存";
}

function deleteReport(id) {
  if (state.storeMode === "firebase") {
    deleteFirebaseReport(id);
    return;
  }

  state.reports = state.reports.filter((report) => report.id !== id);
  persistReports();
  renderCalendar();
}

async function deleteFirebaseReport(id) {
  const { deleteDoc, doc } = state.firestore;
  await deleteDoc(doc(state.collectionRef, id));
}

async function saveReport(event) {
  event.preventDefault();
  const report = {
    id: el.editingId.value || crypto.randomUUID(),
    date: el.date.value,
    member: el.member.value,
    company: el.company.value.trim(),
    contact: el.contact.value.trim(),
    fees: collectFees(),
    note: el.note.value.trim(),
  };

  if (state.storeMode === "firebase") {
    await saveFirebaseReport(report);
    state.cursor = new Date(`${report.date}T00:00:00`);
    clearForm();
    showView("home");
    return;
  }

  if (el.editingId.value) {
    state.reports = state.reports.map((item) => (item.id === report.id ? report : item));
  } else {
    state.reports.push(report);
  }

  state.cursor = new Date(`${report.date}T00:00:00`);
  persistReports();
  clearForm();
  renderCalendar();
  showView("home");
}

async function saveFirebaseReport(report) {
  const { doc, serverTimestamp, setDoc } = state.firestore;
  const { id, ...payload } = report;
  await setDoc(doc(state.collectionRef, id), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

function moveMonth(diff) {
  state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + diff, 1);
  renderCalendar();
}

function showView(name) {
  const isForm = name === "form";
  el.homeView.classList.toggle("active-view", !isForm);
  el.formView.classList.toggle("active-view", isForm);
  window.scrollTo({ top: 0, behavior: "instant" });
}

function bindEvents() {
  el.openForm.addEventListener("click", () => {
    clearForm();
    showView("form");
  });
  el.backHome.addEventListener("click", () => showView("home"));
  el.form.addEventListener("submit", saveReport);
  el.clearForm.addEventListener("click", clearForm);
  el.prevMonth.addEventListener("click", () => moveMonth(-1));
  el.nextMonth.addEventListener("click", () => moveMonth(1));
  el.searchInput.addEventListener("input", () => {
    state.query = el.searchInput.value;
    renderCalendar();
  });
  el.clearSearch.addEventListener("click", () => {
    el.searchInput.value = "";
    state.query = "";
    renderCalendar();
    el.searchInput.focus();
  });
  el.closeDialog.addEventListener("click", () => el.dialog.close());
  el.resetDemo.addEventListener("click", () => {
    state.reports = createDemoReports();
    persistReports();
    clearForm();
    renderCalendar();
    showView("home");
  });

  el.filters.forEach((button) => {
    button.addEventListener("click", () => {
      state.member = button.dataset.member;
      el.filters.forEach((item) => item.classList.toggle("active", item === button));
      renderCalendar();
    });
  });
}

renderFeeInputs();
bindEvents();
clearForm();
loadReports();
