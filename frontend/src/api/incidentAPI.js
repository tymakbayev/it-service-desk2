import APIClient from './apiClient';

/**
 * API клиент для работы с инцидентами
 */
class IncidentAPI {
  /**
   * Получить список инцидентов с возможностью фильтрации
   * @param {Object} filters - Объект с параметрами фильтрации
   * @param {string} [filters.status] - Статус инцидента
   * @param {string} [filters.priority] - Приоритет инцидента
   * @param {string} [filters.assignedTo] - ID пользователя, которому назначен инцидент
   * @param {string} [filters.createdBy] - ID пользователя, создавшего инцидент
   * @param {Date} [filters.startDate] - Начальная дата для фильтрации
   * @param {Date} [filters.endDate] - Конечная дата для фильтрации
   * @returns {Promise<Array>} - Массив инцидентов
   */
  static async getIncidents(filters = {}) {
    return APIClient.get('/incidents', { params: filters });
  }

  /**
   * Получить информацию о конкретном инциденте
   * @param {string} id - ID инцидента
   * @returns {Promise<Object>} - Данные инцидента
   */
  static async getIncident(id) {
    return APIClient.get(`/incidents/${id}`);
  }

  /**
   * Создать новый инцидент
   * @param {Object} data - Данные инцидента
   * @param {string} data.title - Заголовок инцидента
   * @param {string} data.description - Описание инцидента
   * @param {string} data.priority - Приоритет инцидента
   * @param {string} [data.equipmentId] - ID оборудования, связанного с инцидентом
   * @returns {Promise<Object>} - Созданный инцидент
   */
  static async createIncident(data) {
    return APIClient.post('/incidents', data);
  }

  /**
   * Обновить данные инцидента
   * @param {string} id - ID инцидента
   * @param {Object} data - Обновляемые данные
   * @returns {Promise<Object>} - Обновленный инцидент
   */
  static async updateIncident(id, data) {
    return APIClient.put(`/incidents/${id}`, data);
  }

  /**
   * Изменить статус инцидента
   * @param {string} id - ID инцидента
   * @param {string} status - Новый статус
   * @returns {Promise<Object>} - Обновленный инцидент
   */
  static async changeStatus(id, status) {
    return APIClient.patch(`/incidents/${id}/status`, { status });
  }

  /**
   * Назначить инцидент пользователю
   * @param {string} id - ID инцидента
   * @param {string} userId - ID пользователя
   * @returns {Promise<Object>} - Обновленный инцидент
   */
  static async assignIncident(id, userId) {
    return APIClient.patch(`/incidents/${id}/assign`, { userId });
  }
}

export default IncidentAPI;