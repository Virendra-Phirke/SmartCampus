const LOCAL_ADMIN_KEY = 'cm_local_admin_auth';
const LOCAL_ADMIN_CAMPUS_KEY = 'cm_local_admin_campus_id';
const ADMIN_ID = 'ADMIN88';
const ADMIN_PASSWORD = 'Admin@#88';

export const authenticateLocalAdmin = (identifier: string, password: string) => {
  const isMatch = identifier.trim() === ADMIN_ID && password === ADMIN_PASSWORD;
  if (!isMatch) return false;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCAL_ADMIN_KEY, '1');
  }
  return true;
};

export const isLocalAdminAuthenticated = () => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(LOCAL_ADMIN_KEY) === '1';
};

export const clearLocalAdminAuth = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LOCAL_ADMIN_KEY);
  window.localStorage.removeItem(LOCAL_ADMIN_CAMPUS_KEY);
};

export const setLocalAdminCampusId = (campusId: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_ADMIN_CAMPUS_KEY, campusId);
};

export const getLocalAdminCampusId = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(LOCAL_ADMIN_CAMPUS_KEY);
};
