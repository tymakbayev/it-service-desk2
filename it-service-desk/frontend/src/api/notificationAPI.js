import APIClient from './apiClient';

/**
 * API клиент для работы с уведомлениями
 */
class NotificationAPI {
  /**
   * Получить список уведомлений для текущего пользователя
   * @returns {Promise<Array>} - Массив уведомлений
   */
  static async getNotifications() {
    return APIClient.get('/notifications');
  }

  /**
   * Отметить уведомление как прочитанное
   * @param {string} id - ID уведомления
   * @returns {Promise<Object>} - Обновленное уведомление
   */
  static async markAsRead(id) {
    return APIClient.patch(`/notifications/${id}/read`, {});
  }

  /**
   * Отметить все уведомления как прочитанные
   * @returns {Promise<Object>} - Результат операции
   */
  static async markAllAsRead() {
    return APIClient.patch('/notifications/read-all', {});
  }

  /**
   * Подписаться на уведомления в реальном времени
   * @param {Function} callback - Функция обратного вызова для новых уведомлений
   * @returns {Object} - Объект подписки с методом unsubscribe
   */
  static subscribeToNotifications(callback) {
    // Здесь можно реализовать WebSocket или SSE подключение
    // Для примера используем простой интервал
    const intervalId = setInterval(async () => {
      try {
        const notifications = await this.getNotifications();
        const unreadNotifications = notifications.filter(n => !n.read);
        if (unreadNotifications.length > 0) {
          callback(unreadNotifications);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    }, 30000); // Проверка каждые 30 секунд

    return {
      unsubscribe: () => clearInterval(intervalId)
    };
  }
}

export default NotificationAPI;