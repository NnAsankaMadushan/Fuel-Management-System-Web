import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearStoredSessionUser,
  getCurrentUser,
  getStoredSessionUser,
  logoutUser,
} from '../api/api';

const SessionContext = createContext(null);

const getSessionErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Unable to load your session.';

export const SessionProvider = ({ children }) => {
  const [user, setUser] = useState(() => getStoredSessionUser());
  const [status, setStatus] = useState(() => (getStoredSessionUser() ? 'loading' : 'idle'));
  const [error, setError] = useState('');

  const setSessionUser = useCallback((nextUser) => {
    setUser(nextUser || null);
    setStatus(nextUser ? 'authenticated' : 'idle');
    setError('');
  }, []);

  const rehydrateSession = useCallback(async () => {
    setStatus('loading');

    try {
      const nextUser = await getCurrentUser();
      setUser(nextUser || null);
      setStatus(nextUser ? 'authenticated' : 'idle');
      setError('');
      return nextUser;
    } catch (error) {
      if (error?.response?.status === 401) {
        clearStoredSessionUser();
        setUser(null);
        setStatus('idle');
        setError('');
        return null;
      }

      setStatus(getStoredSessionUser() ? 'authenticated' : 'idle');
      setError(getSessionErrorMessage(error));
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      clearStoredSessionUser();
      setUser(null);
      setStatus('idle');
      setError('');
    }
  }, []);

  useEffect(() => {
    if (!getStoredSessionUser()) {
      return;
    }

    rehydrateSession().catch(() => {});
  }, [rehydrateSession]);

  const value = useMemo(
    () => ({
      user,
      status,
      error,
      setSessionUser,
      rehydrateSession,
      signOut,
    }),
    [error, rehydrateSession, setSessionUser, signOut, status, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSession must be used inside SessionProvider');
  }

  return context;
};
