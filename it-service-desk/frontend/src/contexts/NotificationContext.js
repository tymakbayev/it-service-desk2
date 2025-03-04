import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';
import notificationAPI from '../api/notificationAPI';
import { useAuth } from '../hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

// Создаем контекст для уведомлений
export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  // Состояние для хранения списка уведомлений
  const [notifications, setNotifications] = useState([]);
  // Состояние для отслеживания непрочитанных уведомлений
  const [unreadCount, setUnreadCount] = useState(0);
  // Состояние загрузки
  const [loading, setLoading] = useState(false);
  // Состояние ошибки
  const [error, setError] = useState(null);
  // Получаем данные аутентификации пользователя
  const { user, isAuthenticated } = useAuth();
  // Используем хук для отображения всплывающих уведомлений
  const { enqueueSnackbar } = useSnackbar();

  // Функция для загрузки уведомлений с сервера
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated() || !user) return;

    try {
      setLoading(true);
      setError(null);
      const data = await notificationAPI.getNotifications();
      setNotifications(data);
      
      // Подсчет непрочитанных уведомлений
      const unread = data.filter(notification => !notification.read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('Не удалось загрузить уведомления');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // Загружаем уведомления при первой загрузке и при изменении пользователя
  useEffect(() => {
    if (isAuthenticated()) {
      fetchNotifications();
    } else {
      // Если пользователь не аутентифицирован, очищаем уведомления
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchNotifications]);

  // Настраиваем WebSocket или SSE для получения уведомлений в реальном времени
  useEffect(() => {
    if (!isAuthenticated() || !user) return;

    // Функция для настройки соединения с сервером уведомлений
    const setupNotificationConnection = () => {
      const eventSource = new EventSource(`${process.env.REACT_APP_API_BASE_URL}/api/notifications/stream?userId=${user.id}`);
      
      eventSource.onmessage = (event) => {
        try {
          const newNotification = JSON.parse(event.data);
          
          // Добавляем новое уведомление в список и обновляем счетчик
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Показываем всплывающее уведомление
          enqueueSnackbar(newNotification.message, { 
            variant: newNotification.type || 'info',
            autoHideDuration: 5000
          });
        } catch (err) {
          console.error('Error processing notification:', err);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        eventSource.close();
        // Пытаемся переподключиться через 5 секунд
        setTimeout(setupNotificationConnection, 5000);
      };
      
      // Функция очистки при размонтировании компонента
      return () => {
        eventSource.close();
      };
    };
    
    const cleanup = setupNotificationConnection();
    return cleanup;
  }, [isAuthenticated, user, enqueueSnackbar]);

  // Функция для отметки уведомления как прочитанного
  const markAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      
      // Обновляем состояние уведомлений
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
      
      // Уменьшаем счетчик непрочитанных
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      setError('Не удалось отметить уведомление как прочитанное');
    }
  };

  // Функция для отметки всех уведомлений как прочитанных
  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      
      // Обновляем состояние всех уведомлений
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      // Сбрасываем счетчик непрочитанных
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      setError('Не удалось отметить все уведомления как прочитанные');
    }
  };

  // Функция для удаления уведомления
  const deleteNotification = async (notificationId) => {
    try {
      await notificationAPI.deleteNotification(notificationId);
      
      // Удаляем уведомление из списка
      const updatedNotifications = notifications.filter(
        notification => notification.id !== notificationId
      );
      setNotifications(updatedNotifications);
      
      // Пересчитываем количество непрочитанных
      const unread = updatedNotifications.filter(notification => !notification.read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to delete notification:', err);
      setError('Не удалось удалить уведомление');
    }
  };

  // Функция для очистки всех уведомлений
  const clearAllNotifications = async () => {
    try {
      await notificationAPI.clearAllNotifications();
      
      // Очищаем список уведомлений
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to clear all notifications:', err);
      setError('Не удалось очистить все уведомления');
    }
  };

  // Функция для форматирования времени уведомления
  const formatNotificationTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { 
        addSuffix: true,
        locale: ru
      });
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'недавно';
    }
  };

  // Функция для отправки уведомления (для тестирования)
  const sendTestNotification = async (message, type = 'info') => {
    try {
      const newNotification = await notificationAPI.createNotification({
        message,
        type,
        userId: user.id
      });
      
      // Добавляем новое уведомление в список
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Показываем всплывающее уведомление
      enqueueSnackbar(message, { 
        variant: type,
        autoHideDuration: 5000
      });
    } catch (err) {
      console.error('Failed to send test notification:', err);
      setError('Не удалось отправить тестовое уведомление');
    }
  };

  // Значение контекста, которое будет доступно потребителям
  const contextValue = {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    fetchNotifications,
    formatNotificationTime,
    sendTestNotification
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

// Хук для использования контекста уведомлений
export const useNotifications = () => {
  const context = React.useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;