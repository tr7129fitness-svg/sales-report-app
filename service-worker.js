self.addEventListener("push", (event) => {
  const fallback = {
    title: "営業報告が追加されました",
    body: "新しい報告があります。",
    url: "./",
  };

  const payload = event.data ? event.data.json() : fallback;
  const title = payload.title || fallback.title;
  const options = {
    body: payload.body || fallback.body,
    data: {
      url: payload.url || fallback.url,
    },
    icon: "./app-icon.svg",
    badge: "./app-icon.svg",
    tag: payload.tag || "sales-report-created",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "./";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
