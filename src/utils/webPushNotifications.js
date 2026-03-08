const SERVICE_WORKER_PATH = "/sw.js";

const isWebPushSupported = () =>
  typeof window !== "undefined" &&
  "Notification" in window &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
};

const requestNotificationPermission = async () => {
  if (!isWebPushSupported()) {
    return "unsupported";
  }

  const currentPermission = window.Notification.permission;
  if (currentPermission !== "default") {
    return currentPermission;
  }

  try {
    return await window.Notification.requestPermission();
  } catch (error) {
    console.error("Web push permission request failed:", error);
    return "denied";
  }
};

const registerFuelPlusServiceWorker = async () => {
  if (!isWebPushSupported()) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
};

const getCurrentWebPushSubscription = async () => {
  if (!isWebPushSupported()) {
    return null;
  }

  try {
    const registration =
      (await navigator.serviceWorker.getRegistration(SERVICE_WORKER_PATH)) ||
      (await navigator.serviceWorker.getRegistration());

    if (!registration) {
      return null;
    }

    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error("Read web push subscription failed:", error);
    return null;
  }
};

const ensureWebPushSubscription = async ({ vapidPublicKey } = {}) => {
  if (!isWebPushSupported() || !vapidPublicKey) {
    return null;
  }

  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    return null;
  }

  const registration = await registerFuelPlusServiceWorker();
  if (!registration) {
    return null;
  }

  try {
    const currentSubscription = await registration.pushManager.getSubscription();

    if (currentSubscription) {
      return currentSubscription;
    }

    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  } catch (error) {
    console.error("Web push subscribe failed:", error);
    return null;
  }
};

export {
  ensureWebPushSubscription,
  getCurrentWebPushSubscription,
  isWebPushSupported,
};
