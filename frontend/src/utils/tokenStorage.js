// Token storage utility functions

/**
 * Get the authentication token from localStorage
 * @returns {string|null} The stored token or null if not found
 */
export const getToken = () => {
  return localStorage.getItem('auth_token');
};

/**
 * Set the authentication token in localStorage
 * @param {string|null} token - The token to store
 */
export const setToken = (token) => {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

/**
 * Get the refresh token from localStorage
 * @returns {string|null} The stored refresh token or null if not found
 */
export const getRefreshToken = () => {
  return localStorage.getItem('refresh_token');
};

/**
 * Set the refresh token in localStorage
 * @param {string|null} token - The refresh token to store
 */
export const setRefreshToken = (token) => {
  if (token) {
    localStorage.setItem('refresh_token', token);
  } else {
    localStorage.removeItem('refresh_token');
  }
};

/**
 * Clear all authentication tokens from localStorage
 */
export const clearTokens = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
};
