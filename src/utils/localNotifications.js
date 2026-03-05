const STORAGE_PREFIX = 'fuelplus_local_notifications';
const MAX_NOTIFICATIONS = 200;

const buildStorageKey = (userId) => `${STORAGE_PREFIX}:${String(userId || '').trim()}`;

const parseNotificationList = (rawValue) => {
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch (error) {
    console.error('Failed to parse local notifications:', error);
    return [];
  }
};

const normalizeNotification = (notification = {}) => {
  const createdAt = notification.createdAt || new Date().toISOString();
  const notificationId =
    notification._id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  return {
    _id: notificationId,
    title: String(notification.title || 'Notification'),
    message: String(notification.message || ''),
    type: String(notification.type || 'fuel_transaction'),
    status: String(notification.status || 'completed'),
    isRead: Boolean(notification.isRead),
    createdAt,
    vehicle: notification.vehicle || null,
  };
};

const sortByNewest = (notifications) =>
  [...notifications].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

const readLocalNotifications = (userId) => {
  if (typeof window === 'undefined') {
    return [];
  }

  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) {
    return [];
  }

  const storedValue = window.localStorage.getItem(buildStorageKey(normalizedUserId));
  return sortByNewest(parseNotificationList(storedValue).map(normalizeNotification));
};

const writeLocalNotifications = (userId, notifications = []) => {
  if (typeof window === 'undefined') {
    return [];
  }

  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) {
    return [];
  }

  const normalizedList = sortByNewest(
    notifications.map((notification) => normalizeNotification(notification)),
  ).slice(0, MAX_NOTIFICATIONS);

  window.localStorage.setItem(buildStorageKey(normalizedUserId), JSON.stringify(normalizedList));
  return normalizedList;
};

const addLocalNotification = (userId, notification = {}) => {
  const currentNotifications = readLocalNotifications(userId);
  const nextNotification = normalizeNotification(notification);
  const deduplicatedNotifications = currentNotifications.filter(
    (entry) => entry._id !== nextNotification._id,
  );

  return writeLocalNotifications(userId, [nextNotification, ...deduplicatedNotifications]);
};

const markLocalNotificationAsRead = (userId, notificationId) => {
  const normalizedNotificationId = String(notificationId || '').trim();
  if (!normalizedNotificationId) {
    return { notifications: readLocalNotifications(userId), updated: false };
  }

  let updated = false;
  const nextNotifications = readLocalNotifications(userId).map((notification) => {
    if (notification._id !== normalizedNotificationId || notification.isRead) {
      return notification;
    }

    updated = true;
    return {
      ...notification,
      isRead: true,
    };
  });

  return {
    notifications: writeLocalNotifications(userId, nextNotifications),
    updated,
  };
};

const markAllLocalNotificationsAsRead = (userId) => {
  let modifiedCount = 0;
  const nextNotifications = readLocalNotifications(userId).map((notification) => {
    if (notification.isRead) {
      return notification;
    }

    modifiedCount += 1;
    return {
      ...notification,
      isRead: true,
    };
  });

  return {
    notifications: writeLocalNotifications(userId, nextNotifications),
    modifiedCount,
  };
};

export {
  addLocalNotification,
  markAllLocalNotificationsAsRead,
  markLocalNotificationAsRead,
  readLocalNotifications,
};
