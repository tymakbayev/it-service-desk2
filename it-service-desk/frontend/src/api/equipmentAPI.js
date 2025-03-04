import apiClient from './apiClient';

const EquipmentAPI = {
  /**
   * Get equipment list with optional filters
   * @param {Object} filters - Optional filters for equipment
   * @param {string} [filters.status] - Equipment status filter
   * @param {string} [filters.type] - Equipment type filter
   * @param {string} [filters.assignedTo] - User ID equipment is assigned to
   * @param {number} [filters.page=1] - Page number for pagination
   * @param {number} [filters.limit=10] - Items per page
   * @returns {Promise<Object>} Equipment list with pagination info
   */
  async getEquipment(filters = {}) {
    try {
      const response = await apiClient.get('/equipment', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Get equipment error:', error);
      throw error;
    }
  },

  /**
   * Get equipment by ID
   * @param {string} id - Equipment ID
   * @returns {Promise<Object>} Equipment details
   */
  async getEquipmentById(id) {
    try {
      const response = await apiClient.get(`/equipment/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Get equipment ${id} error:`, error);
      throw error;
    }
  },

  /**
   * Create new equipment
   * @param {Object} data - Equipment data
   * @returns {Promise<Object>} Created equipment
   */
  async createEquipment(data) {
    try {
      const response = await apiClient.post('/equipment', data);
      return response.data;
    } catch (error) {
      console.error('Create equipment error:', error);
      throw error;
    }
  },

  /**
   * Update equipment by ID
   * @param {string} id - Equipment ID
   * @param {Object} data - Updated equipment data
   * @returns {Promise<Object>} Updated equipment
   */
  async updateEquipment(id, data) {
    try {
      const response = await apiClient.put(`/equipment/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Update equipment ${id} error:`, error);
      throw error;
    }
  },

  /**
   * Assign equipment to a user
   * @param {string} id - Equipment ID
   * @param {string} userId - User ID to assign equipment to
   * @returns {Promise<Object>} Updated equipment
   */
  async assignEquipment(id, userId) {
    try {
      const response = await apiClient.post(`/equipment/${id}/assign`, { userId });
      return response.data;
    } catch (error) {
      console.error(`Assign equipment ${id} error:`, error);
      throw error;
    }
  },
  
  /**
   * Unassign equipment from a user
   * @param {string} id - Equipment ID
   * @returns {Promise<Object>} Updated equipment
   */
  async unassignEquipment(id) {
    try {
      const response = await apiClient.post(`/equipment/${id}/unassign`);
      return response.data;
    } catch (error) {
      console.error(`Unassign equipment ${id} error:`, error);
      throw error;
    }
  }
};

export default EquipmentAPI;
