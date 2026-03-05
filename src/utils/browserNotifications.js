const isNotificationSupported = () =>
  typeof window !== 'undefined' && typeof window.Notification !== 'undefined';

export const getBrowserNotificationPermission = () => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  return window.Notification.permission;
};

export const requestBrowserNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  const currentPermission = window.Notification.permission;
  if (currentPermission !== 'default') {
    return currentPermission;
  }

  try {
    return await window.Notification.requestPermission();
  } catch (error) {
    console.error('Browser notification permission request failed:', error);
    return 'denied';
  }
};

export const sendBrowserNotification = ({ title, message, tag }) => {
  if (!isNotificationSupported() || window.Notification.permission !== 'granted') {
    return null;
  }

  try {
    const browserNotification = new window.Notification(title || 'FuelPlus', {
      body: message || '',
      tag: tag || `fuelplus-${Date.now()}`,
      renotify: false,
    });

    browserNotification.onclick = () => {
      window.focus();
      browserNotification.close();
    };

    return browserNotification;
  } catch (error) {
    console.error('Browser notification dispatch failed:', error);
    return null;
  }
};
