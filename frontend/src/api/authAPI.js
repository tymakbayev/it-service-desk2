import apiClient from './apiClient';
import { setToken, setRefreshToken } from '../utils/tokenStorage';

const AuthAPI = {
  /**
   * Login user with credentials
   * @param {Object} credentials - User credentials
   * @param {string} credentials.email - User email
   * @param {string} credentials.password - User password
   * @returns {Promise<Object>} User data with tokens
   */
  async login(credentials) {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const { token, refreshToken, user } = response.data;
      
      // Store tokens
      setToken(token);
      setRefreshToken(refreshToken);
      
      return { user, token };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user data
   */
  async register(userData) {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  /**
   * Refresh the authentication token
   * @returns {Promise<string>} New token
   */
  async refreshToken() {
    try {
      const response = await apiClient.post('/auth/refresh-token');
      const { token } = response.data;
      
      // Update stored token
      setToken(token);
      
      return token;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  },

  /**
   * Get current authenticated user data
   * @returns {Promise<Object>} User data
   */
  async getCurrentUser() {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  },

  /**
   * Logout current user
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens regardless of API response
      setToken(null);
      setRefreshToken(null);
    }
  }
};

export default AuthAPI;
