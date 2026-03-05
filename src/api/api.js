import axios from 'axios';
import { normalizeUserRole } from '../utils/userRole';
import {
  addLocalNotification,
  markAllLocalNotificationsAsRead,
  markLocalNotificationAsRead,
  readLocalNotifications,
} from '../utils/localNotifications';

const SESSION_USER_KEY = 'fuelplus_user';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Use the environment variable
  withCredentials: true,                 // Allow credentials (cookies) if needed
});

const normalizeUser = (user) => {
  if (!user) {
    return null;
  }

  const {
    _id,
    name,
    email,
    role,
    phoneNumber,
    nicNumber,
    stationNames,
    primaryStationName,
    mustChangePassword,
    emailVerified,
  } = user;
  return {
    _id,
    name,
    email,
    role: normalizeUserRole(role),
    phoneNumber,
    nicNumber,
    mustChangePassword: Boolean(mustChangePassword),
    emailVerified: emailVerified !== false,
    stationNames: Array.isArray(stationNames) ? stationNames.filter(Boolean) : [],
    primaryStationName: typeof primaryStationName === 'string' ? primaryStationName : '',
  };
};

export const storeSessionUser = (user) => {
  const normalizedUser = normalizeUser(user);

  if (!normalizedUser) {
    localStorage.removeItem(SESSION_USER_KEY);
    return null;
  }

  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(normalizedUser));
  return normalizedUser;
};

export const getStoredSessionUser = () => {
  try {
    const stored = localStorage.getItem(SESSION_USER_KEY);
    return stored ? normalizeUser(JSON.parse(stored)) : null;
  } catch (error) {
    console.error('Read session user error:', error);
    return null;
  }
};

export const clearStoredSessionUser = () => {
  localStorage.removeItem(SESSION_USER_KEY);
};

// Login a user
export const loginUser = async (credentials) => {
  try {
    const response = await api.post('/api/users/login', credentials);
    return storeSessionUser(response.data);
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Logout a user
export const logoutUser = async () => {
  try {
    const response = await api.post('/api/users/logout'); // Call the logout endpoint
    clearStoredSessionUser();
    return response.data; // You can return the response if needed
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

// Sign up a new user
export const signupUser = async (userData) => {
    try {
      const response = await api.post('/api/users/signup', userData); // Call the signup endpoint
      return response.data; // Return the response data
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

export const resendSignupOtp = async (email) => {
  try {
    const response = await api.post('/api/users/signup/resend-otp', { email });
    return response.data;
  } catch (error) {
    console.error('Resend signup OTP error:', error);
    throw error;
  }
};

export const confirmSignupUser = async (email, otp) => {
  try {
    const response = await api.post('/api/users/signup/confirm', { email, otp });
    return response.data;
  } catch (error) {
    console.error('Confirm signup OTP error:', error);
    throw error;
  }
};

export const requestEmailVerificationOtp = async (email) => {
  try {
    const response = await api.post('/api/users/email-verification/request-otp', { email });
    return response.data;
  } catch (error) {
    console.error('Request email OTP error:', error);
    throw error;
  }
};

export const verifyEmailVerificationOtp = async (email, otp) => {
  try {
    const response = await api.post('/api/users/email-verification/verify-otp', { email, otp });
    return response.data;
  } catch (error) {
    console.error('Verify email OTP error:', error);
    throw error;
  }
};

export const createStationOwnerByAdmin = async (payload) => {
  try {
    const response = await api.post('/api/users/admin/station-owners', payload);
    return response.data;
  } catch (error) {
    console.error('Create station owner error:', error);
    throw error;
  }
};

export const getMyVehicles = async () => {
  try {
    const response = await api.get('/api/vehicles/mine');
    return response.data;
  } catch (error) {
    console.error('Get my vehicles error:', error);
    throw error;
  }
};

export const updateVehicleApproval = async (vehicleId, payload) => {
  try {
    const response = await api.patch(`/api/vehicles/${vehicleId}/approval`, payload);
    return response.data;
  } catch (error) {
    console.error('Update vehicle approval error:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/api/users/me');
    return storeSessionUser(response.data);
  } catch (error) {
    if (error?.response?.status === 401) {
      clearStoredSessionUser();
    }
    console.error('Get current user error:', error);
    throw error;
  }
};

export const changePassword = async (payload) => {
  try {
    const response = await api.put('/api/users/change-password', payload);
    const updatedUser = response.data?.user ? storeSessionUser(response.data.user) : getStoredSessionUser();

    return {
      ...response.data,
      ...(updatedUser ? { user: updatedUser } : {}),
    };
  } catch (error) {
    console.error('Change password error:', error);
    throw error;
  }
};

export const getVehicleLogs = async () => {
  try {
    const response = await api.get('/api/fuel/vehicle-logs');
    return response.data;
  } catch (error) {
    console.error('Get vehicle logs error:', error);
    throw error;
  }
};

export const getMyNotifications = async () => {
  try {
    const userId = getStoredSessionUser()?._id;
    return readLocalNotifications(userId);
  } catch (error) {
    console.error('Get notifications error:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    const userId = getStoredSessionUser()?._id;
    const { updated } = markLocalNotificationAsRead(userId, notificationId);

    return {
      message: updated ? 'Notification marked as read' : 'Notification already read',
      notification: {
        _id: notificationId,
        isRead: true,
      },
    };
  } catch (error) {
    console.error('Mark notification as read error:', error);
    throw error;
  }
};

export const markAllNotificationsAsRead = async () => {
  try {
    const userId = getStoredSessionUser()?._id;
    const { modifiedCount } = markAllLocalNotificationsAsRead(userId);

    return {
      message: 'Notifications marked as read',
      modifiedCount,
    };
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    throw error;
  }
};

export const createLocalNotification = async (notification, options = {}) => {
  try {
    const userId = options.userId || getStoredSessionUser()?._id;

    if (!userId) {
      return null;
    }

    const nextNotifications = addLocalNotification(userId, notification);
    return nextNotifications[0] || null;
  } catch (error) {
    console.error('Create local notification error:', error);
    throw error;
  }
};

export const getStationLogs = async () => {
  try {
    const response = await api.get('/api/fuel/station-logs');
    return response.data;
  } catch (error) {
    console.error('Get station logs error:', error);
    throw error;
  }
};

export const getStationSummary = async () => {
  try {
    const response = await api.get('/api/fuel/station-summary');
    return response.data;
  } catch (error) {
    console.error('Get station summary error:', error);
    throw error;
  }
};

export const registerFuelTransaction = async (payload) => {
  try {
    const response = await api.post('/api/fuel/register', payload);
    return response.data;
  } catch (error) {
    console.error('Register fuel transaction error:', error);
    throw error;
  }
};

export const getMyStations = async () => {
  try {
    const response = await api.get('/api/stations/getAllStaionsByUserId');
    return response.data;
  } catch (error) {
    console.error('Get my stations error:', error);
    throw error;
  }
};

export const updateStation = async (stationRegNumber, payload) => {
  try {
    const response = await api.put(`/api/stations/update/${encodeURIComponent(stationRegNumber)}`, payload);
    return response.data;
  } catch (error) {
    console.error('Update station error:', error);
    throw error;
  }
};

export default api;
