const MAX_FILE_BYTES = 15 * 1024 * 1024;
const PROJECT_ID = "sales-report-app-7fde0";
const ADMIN_EMAIL = "tr7129.fitness@gmail.com";
const FIREBASE_API_KEY = "AIzaSyB9e6nGyNpaHgPWwj3urQl2ohi9b49aUkY";
const APP_ORIGIN = "https://tr7129fitness-svg.github.io";
const DRIVE_API_ROOT = "https://www.googleapis.com/drive/v3/files";
const MIME_TYPES = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  gif: "image/gif", webp: "image/webp", heic: "image/heic", heif: "image/heif", avif: "image/avif",
};

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    ok: true, service: "sales-report-price-list-uploader", version: "approved-members-v2",
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const p = e && e.parameter ? e.parameter : {};
  let result;
  try {
    if (p.origin !== APP_ORIGIN) throw new Error("許可されていない接続元です。");
    if (!/^[a-zA-Z0-9-]{20,60}$/.test(String(p.request_id || ""))) throw new Error("無効なリクエストです。");
    verifyAuthorizedUser_(p.firebase_id_token);
    if (p.action === "uploadPriceList") result = { ok: true, data: saveFile_(p) };
    else if (p.action === "readPriceList") result = { ok: true, data: readFile_(p.file_id) };
    else throw new Error("無効な処理です。");
  } catch (error) {
    result = { ok: false, error: error.message || "処理に失敗しました。" };
  }
  // Reply only to the approved app. Tokens are never stored or put in URLs.
  const message = JSON.stringify({ ...result, requestId: String(p.request_id || "") })
    .replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return HtmlService.createHtmlOutput('<!doctype html><script>window.top.postMessage('
    + message + ',' + JSON.stringify(APP_ORIGIN) + ');</script>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function verifyAuthorizedUser_(idToken) {
  const token = String(idToken || "");
  if (!token || token.length > 10000) throw new Error("Googleログインが必要です。");
  const response = UrlFetchApp.fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + FIREBASE_API_KEY,
    { method: "post", contentType: "application/json", payload: JSON.stringify({ idToken: token }), muteHttpExceptions: true },
  );
  if (response.getResponseCode() !== 200) throw new Error("ログインを確認できません。再ログインしてください。");
  const user = JSON.parse(response.getContentText()).users?.[0];
  if (!user || user.disabled || user.emailVerified !== true) throw new Error("確認済みのGoogleアカウントが必要です。");
  // The authenticated lookup above validates the signature; also bind this token to our project and session.
  const claims = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(token.split(".")[1])).getDataAsString());
  if (claims.aud !== PROJECT_ID || claims.iss !== "https://securetoken.google.com/" + PROJECT_ID
      || claims.sub !== user.localId || claims.exp * 1000 <= Date.now()
      || Number(claims.auth_time) < Number(user.validSince || 0)
      || claims.firebase?.sign_in_provider !== "google.com") throw new Error("ログインの有効期限が切れました。");
  if (user.email === ADMIN_EMAIL) return user;
  const membership = UrlFetchApp.fetch(
    "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID + "/databases/(default)/documents/members/" + encodeURIComponent(user.localId),
    { headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true },
  );
  if (membership.getResponseCode() !== 200 || JSON.parse(membership.getContentText()).fields?.status?.stringValue !== "approved") {
    throw new Error("管理者による利用承認が必要です。");
  }
  return user;
}

function ensureFolder_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const id = properties.getProperty("PRICE_LIST_FOLDER_ID");
    if (id) return id;
    const folder = driveJson_(DRIVE_API_ROOT, {
      method: "post", contentType: "application/json",
      payload: JSON.stringify({ name: "営業報告アプリ_料金表", mimeType: "application/vnd.google-apps.folder" }),
    });
    properties.setProperty("PRICE_LIST_FOLDER_ID", folder.id);
    return folder.id;
  } finally { lock.releaseLock(); }
}

function saveFile_(p) {
  const fileName = String(p.file_name || "料金表").replace(/[\\/:*?"<>|]/g, "_").slice(0,180);
  const mimeType = MIME_TYPES[fileName.toLowerCase().split(".").pop()];
  if (!mimeType) throw new Error("PDF・対応画像形式を選択してください。");
  const base64 = String(p.file_data || "");
  if (base64.length > Math.ceil(MAX_FILE_BYTES / 3) * 4) throw new Error("1点15MB以下にしてください。");
  const bytes = Utilities.base64Decode(base64);
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new Error("ファイルサイズを確認してください。");
  const folderId = ensureFolder_();
  const boundary = "sales-" + Utilities.getUuid();
  const metadata = JSON.stringify({ name: fileName, parents: [folderId], appProperties: { app: "sales-report" } });
  const prefix = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + metadata
    + "\r\n--" + boundary + "\r\nContent-Type: " + mimeType + "\r\n\r\n";
  const payload = Utilities.newBlob(Utilities.newBlob(prefix).getBytes().concat(bytes,
    Utilities.newBlob("\r\n--" + boundary + "--\r\n").getBytes()));
  const file = driveJson_("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType", {
    method: "post", contentType: "multipart/related; boundary=" + boundary, payload: payload.getBytes(),
  });
  return { fileId: file.id, fileName: file.name, mimeType: file.mimeType,
    url: "https://drive.google.com/file/d/" + file.id + "/view", uploadedAt: new Date().toISOString() };
}

function readFile_(fileId) {
  const id = String(fileId || "");
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(id)) throw new Error("無効なファイルです。");
  const folderId = PropertiesService.getScriptProperties().getProperty("PRICE_LIST_FOLDER_ID");
  const file = driveJson_(DRIVE_API_ROOT + "/" + id + "?fields=id,name,mimeType,parents,size,trashed", {});
  if (!folderId || !file.parents?.includes(folderId) || file.trashed
      || !Object.values(MIME_TYPES).includes(file.mimeType) || Number(file.size) > MAX_FILE_BYTES) {
    throw new Error("この料金表にはアクセスできません。");
  }
  const response = driveFetch_(DRIVE_API_ROOT + "/" + id + "?alt=media", {});
  return { fileName: file.name, mimeType: file.mimeType, base64: Utilities.base64Encode(response.getBlob().getBytes()) };
}

function driveFetch_(url, options) {
  const response = UrlFetchApp.fetch(url, {
    ...options, headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() }, muteHttpExceptions: true,
  });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    console.error("Drive request failed", response.getResponseCode(), response.getContentText());
    throw new Error("Google Driveへの接続に失敗しました。管理者にご確認ください。");
  }
  return response;
}

function driveJson_(url, options) {
  return JSON.parse(driveFetch_(url, options).getContentText());
}
