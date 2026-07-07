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

export function hasFirebaseConfig() {
  return Object.values(firebaseConfig).every((value) => String(value).trim().length > 0);
}

export function hasWebPushConfig() {
  return webPushPublicKey.trim().length > 0;
}
