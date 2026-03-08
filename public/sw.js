self.addEventListener("push", (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (error) {
      payload = { body: event.data.text() };
    }
  }

  const title =
    typeof payload?.title === "string" && payload.title.trim()
      ? payload.title.trim()
      : "FuelPlus";
  const body = typeof payload?.body === "string" ? payload.body : "";
  const data = payload?.data && typeof payload.data === "object" ? payload.data : {};

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data,
      icon: "/fuel-plus.svg",
      badge: "/fuel-plus.svg",
      renotify: false,
      tag:
        typeof data?.notificationId === "string" && data.notificationId
          ? `fuelplus-${data.notificationId}`
          : `fuelplus-${Date.now()}`,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notificationData =
    event.notification?.data && typeof event.notification.data === "object"
      ? event.notification.data
      : {};
  const targetPath =
    typeof notificationData.url === "string" && notificationData.url.trim()
      ? notificationData.url.trim()
      : "/";
  const targetUrl = new URL(targetPath, self.location.origin).toString();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        try {
          const clientUrl = new URL(client.url);
          const destinationUrl = new URL(targetUrl);

          if (clientUrl.origin === destinationUrl.origin) {
            if ("navigate" in client) {
              client.navigate(destinationUrl.pathname + destinationUrl.search + destinationUrl.hash);
            }

            return client.focus();
          }
        } catch (_error) {
          // Ignore malformed client URL and continue to next client.
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
