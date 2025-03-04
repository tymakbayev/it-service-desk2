import React, { useState, useEffect } from 'react';
import { Alert, Snackbar, Badge, IconButton, Menu, MenuItem, Typography, Box } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';

// Notification API service
class NotificationAPI {
  static async getNotifications() {
    return apiClient.get('/notifications');
  }

  static async markAsRead(notificationId) {
    return apiClient.patch(`/notifications/${notificationId}/read`);
  }

  static async markAllAsRead() {
    return apiClient.post('/notifications/read-all');
  }
}

const NotificationComponent = () => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Fetch notifications on component mount and when auth state changes
  useEffect(() => {
    if (isAuthenticated()) {
      fetchNotifications();
      
      // Set up polling for new notifications
      const intervalId = setInterval(fetchNotifications, 60000); // Poll every minute
      
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated]);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    if (!isAuthenticated()) return;
    
    setLoading(true);
    try {
      const data = await NotificationAPI.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.notifications.filter(n => !n.read).length);
      
      // Show snackbar for newest unread notification if any
      const newestUnread = data.notifications.find(n => !n.read);
      if (newestUnread && !anchorEl) { // Only show if notification menu is closed
        setSnackbar({
          open: true,
          message: newestUnread.message,
          severity: getNotificationSeverity(newestUnread.type)
        });
      }
    } catch (err) {
      setError('Failed to fetch notifications');
      console.error('Notification fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Map notification type to severity
  const getNotificationSeverity = (type) => {
    const severityMap = {
      'incident_assigned': 'info',
      'incident_updated': 'info',
      'incident_resolved': 'success',
      'incident_reopened': 'warning',
      'equipment_issue': 'warning',
      'system': 'info',
      'urgent': 'error'
    };
    return severityMap[type] || 'info';
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.read) {
        await NotificationAPI.markAsRead(notification.id);
        setNotifications(notifications.map(n => 
          n.id === notification.id ? { ...n, read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Handle navigation based on notification type
      if (notification.link) {
        window.location.href = notification.link;
      }
      
      handleMenuClose();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      await NotificationAPI.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      handleMenuClose();
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Menu handlers
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Snackbar handlers
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Don't render if not authenticated
  if (!isAuthenticated()) {
    return null;
  }

  return (
    <>
      <IconButton 
        color="inherit" 
        onClick={handleMenuOpen}
        aria-label="notifications"
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          style: {
            maxHeight: 400,
            width: 320,
          },
        }}
      >
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Typography 
              variant="caption" 
              color="primary" 
              sx={{ cursor: 'pointer' }}
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </Typography>
          )}
        </Box>
        
        {loading && notifications.length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2">Loading notifications...</Typography>
          </MenuItem>
        )}
        
        {!loading && notifications.length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2">No notifications</Typography>
          </MenuItem>
        )}
        
        {error && (
          <MenuItem disabled>
            <Typography variant="body2" color="error">{error}</Typography>
          </MenuItem>
        )}
        
        {notifications.map((notification) => (
          <MenuItem 
            key={notification.id} 
            onClick={() => handleNotificationClick(notification)}
            sx={{
              backgroundColor: notification.read ? 'inherit' : 'rgba(0, 0, 0, 0.04)',
              borderLeft: `4px solid ${notification.read ? 'transparent' : '#1976d2'}`
            }}
          >
            <Box sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2">
                  {notification.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" noWrap>
                {notification.message}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
      
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default NotificationComponent;
