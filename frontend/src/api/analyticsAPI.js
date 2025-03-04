import APIClient from './apiClient';

class AnalyticsAPI {
  constructor() {
    this.client = new APIClient();
    this.baseUrl = '/api/analytics';
  }

  /**
   * Получает данные для дашборда
   * @returns {Promise<Object>} Данные дашборда
   */
  async getDashboardData() {
    try {
      const response = await this.client.get(`${this.baseUrl}/dashboard`);
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }

  /**
   * Получает статистику по инцидентам с применением фильтров
   * @param {Object} filters - Объект с фильтрами
   * @param {string} [filters.status] - Статус инцидента
   * @param {string} [filters.priority] - Приоритет инцидента
   * @param {string} [filters.startDate] - Начальная дата
   * @param {string} [filters.endDate] - Конечная дата
   * @param {string} [filters.assignedTo] - ID ответственного сотрудника
   * @returns {Promise<Object>} Статистика по инцидентам
   */
  async getIncidentStats(filters = {}) {
    try {
      const response = await this.client.get(`${this.baseUrl}/incidents/stats`, { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching incident statistics:', error);
      throw error;
    }
  }

  /**
   * Получает статистику по оборудованию с применением фильтров
   * @param {Object} filters - Объект с фильтрами
   * @param {string} [filters.type] - Тип оборудования
   * @param {string} [filters.status] - Статус оборудования
   * @param {string} [filters.department] - Отдел
   * @param {string} [filters.purchaseDate] - Дата покупки
   * @returns {Promise<Object>} Статистика по оборудованию
   */
  async getEquipmentStats(filters = {}) {
    try {
      const response = await this.client.get(`${this.baseUrl}/equipment/stats`, { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching equipment statistics:', error);
      throw error;
    }
  }

  /**
   * Генерирует отчет указанного типа с заданными параметрами
   * @param {string} type - Тип отчета (incidents, equipment, users)
   * @param {Object} params - Параметры отчета
   * @param {string} [params.format] - Формат отчета (pdf, csv, excel)
   * @param {string} [params.startDate] - Начальная дата
   * @param {string} [params.endDate] - Конечная дата
   * @param {Object} [params.filters] - Дополнительные фильтры
   * @returns {Promise<Object>} Сгенерированный отчет или ссылка на его скачивание
   */
  async generateReport(type, params = {}) {
    try {
      const response = await this.client.post(`${this.baseUrl}/reports/${type}`, params);
      return response.data;
    } catch (error) {
      console.error(`Error generating ${type} report:`, error);
      throw error;
    }
  }
}

export default new AnalyticsAPI();
