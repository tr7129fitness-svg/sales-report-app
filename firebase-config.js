export const firebaseConfig = {
  apiKey: "AIzaSyB9e6nGyNpaHgPWwj3urQl2ohi9b49aUkY",
  authDomain: "sales-report-app-7fde0.firebaseapp.com",
  projectId: "sales-report-app-7fde0",
  storageBucket: "sales-report-app-7fde0.firebasestorage.app",
  messagingSenderId: "164547707960",
  appId: "1:164547707960:web:59c733082ccdcff41292cd",
};

export const webPushPublicKey =
  "BEVYci_ey1kU6y7D1UvG0wxXsQ5A7xsbbEjDCERy044ywaqjActpcoWbjFDnO8DJkfd8CKqiUIFjmzebfUJ-Kpo";

export const driveUploadSettings = {
  // Apps ScriptをWebアプリとして公開した後に、末尾が /exec のURLを貼り付けます。
  endpoint: "https://script.google.com/macros/s/AKfycbw72BdFZSbGwPX7R8RKw2NmTdTU9NdHBnnnvN9nXztM86v4C4ax54SqYHe8XnWwth96/exec",
};

export function hasFirebaseConfig() {
  return Object.values(firebaseConfig).every((value) => String(value).trim().length > 0);
}

export function hasWebPushConfig() {
  return webPushPublicKey.trim().length > 0;
}
