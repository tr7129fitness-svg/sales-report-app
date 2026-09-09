const PRICE_LIST_FOLDER_ID = "1epPdI7icyX07qxD6QNV9-MtwqLx_bSQE";
const STATUS_PREFIX = "price-list-upload:";
const MAX_FILE_BYTES = 15 * 1024 * 1024;

/**
 * Receives a PDF from the sales-report app and saves it to the configured
 * Google Drive folder. Deploy this project as an Apps Script Web App.
 */
function doPost(e) {
  const parameters = e && e.parameter ? e.parameter : {};
  const uploadId = String(parameters.upload_id || "");

  try {
    if (parameters.action !== "uploadPriceList") throw new Error("無効な処理です。");
    if (!uploadId) throw new Error("アップロードIDがありません。");
    assertUploadKey_(parameters.upload_key);

    const fileName = normalizeFileName_(parameters.file_name);
    const mimeType = String(parameters.mime_type || "");
    if (mimeType !== "application/pdf" && !fileName.toLowerCase().endsWith(".pdf")) {
      throw new Error("PDFファイルだけを登録できます。");
    }

    const bytes = Utilities.base64Decode(String(parameters.file_data || ""));
    if (!bytes.length) throw new Error("PDFの内容を読み取れませんでした。");
    if (bytes.length > MAX_FILE_BYTES) throw new Error("PDFは15MB以下にしてください。");

    const folder = DriveApp.getFolderById(PRICE_LIST_FOLDER_ID);
    const file = folder.createFile(Utilities.newBlob(bytes, "application/pdf", fileName));
    const result = {
      status: "complete",
      fileId: file.getId(),
      fileName: file.getName(),
      url: file.getUrl(),
      uploadedAt: new Date().toISOString(),
    };
    setStatus_(uploadId, result);
    return response_({ ok: true, data: result });
  } catch (error) {
    const failure = {
      status: "failed",
      message: error && error.message ? error.message : "Google Driveへの保存に失敗しました。",
    };
    if (uploadId) setStatus_(uploadId, failure);
    return response_({ ok: false, error: failure.message });
  }
}

/** The browser checks the upload result through JSONP to avoid CORS issues. */
function doGet(e) {
  const parameters = e && e.parameter ? e.parameter : {};
  const callback = String(parameters.callback || "");
  const result = parameters.action === "getUploadStatus"
    ? { ok: true, data: getStatus_(String(parameters.upload_id || "")) }
    : { ok: true, service: "sales-report-price-list-uploader" };
  return response_(result, callback);
}

function assertUploadKey_(providedKey) {
  const expectedKey = PropertiesService.getScriptProperties().getProperty("PRICE_LIST_UPLOAD_KEY");
  if (!expectedKey) throw new Error("PRICE_LIST_UPLOAD_KEYが未設定です。");
  if (String(providedKey || "") !== expectedKey) throw new Error("アップロードの認証に失敗しました。");
}

function normalizeFileName_(name) {
  const cleaned = String(name || "料金表.pdf")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "料金表.pdf";
}

function statusKey_(uploadId) {
  return STATUS_PREFIX + uploadId;
}

function setStatus_(uploadId, data) {
  PropertiesService.getScriptProperties().setProperty(statusKey_(uploadId), JSON.stringify(data));
}

function getStatus_(uploadId) {
  if (!uploadId) return { status: "missing" };
  const raw = PropertiesService.getScriptProperties().getProperty(statusKey_(uploadId));
  if (!raw) return { status: "pending" };
  try {
    return JSON.parse(raw);
  } catch (_) {
    return { status: "failed", message: "アップロード結果を読み取れませんでした。" };
  }
}

function response_(data, callback) {
  const json = JSON.stringify(data);
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService.createTextOutput(`${callback}(${json});`).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
