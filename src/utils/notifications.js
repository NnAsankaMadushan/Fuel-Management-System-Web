export const NOTIFICATION_READ_EVENT = 'fuelplus:notification-read';

export const applyNotificationRead = (notifications, notificationId) =>
  notifications.map((notification) =>
    notification._id === notificationId ? { ...notification, isRead: true } : notification
  );

export const emitNotificationRead = (notificationId) => {
  if (!notificationId || typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_READ_EVENT, {
      detail: { notificationId },
    })
  );
};
