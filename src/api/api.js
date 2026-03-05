import axios from 'axios';
import { normalizeUserRole } from '../utils/userRole';

const SESSION_USER_KEY = 'fuelplus_user';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Use the environment variable
  withCredentials: true,                 // Allow credentials (cookies) if needed
});

const normalizeUser = (user) => {
  if (!user) {
    return null;
  }

  const { _id, name, email, role, phoneNumber, nicNumber, stationNames, primaryStationName } = user;
  return {
    _id,
    name,
    email,
    role: normalizeUserRole(role),
    phoneNumber,
    nicNumber,
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
    const response = await api.get('/api/notifications/mine');
    return response.data;
  } catch (error) {
    console.error('Get notifications error:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await api.patch(`/api/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error('Mark notification as read error:', error);
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
