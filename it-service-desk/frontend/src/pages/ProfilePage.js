import React, { useState, useEffect, useContext } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Avatar,
  Box,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tabs,
  Tab,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  VpnKey as PasswordIcon,
  Notifications as NotificationsIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { NotificationContext } from '../contexts/NotificationContext';
import useAuth from '../hooks/useAuth';
import authAPI from '../api/authAPI';
import incidentAPI from '../api/incidentAPI';
import notificationAPI from '../api/notificationAPI';
import { formatDate } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ProfilePage = () => {
  const { user, updateUserInfo, logout } = useContext(AuthContext);
  const { notifications } = useContext(NotificationContext);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Состояния для профиля пользователя
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    avatar: null
  });
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    incidentUpdates: true,
    systemAnnouncements: true
  });

  // Загрузка данных пользователя
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        department: user.department || '',
        position: user.position || '',
        avatar: user.avatar || null
      });

      // Загрузка последних инцидентов пользователя
      fetchRecentIncidents();
      
      // Загрузка последних активностей пользователя
      fetchRecentActivities();
      
      // Загрузка настроек уведомлений
      fetchNotificationSettings();
    }
  }, [user, isAuthenticated, navigate]);

  const fetchRecentIncidents = async () => {
    try {
      const response = await incidentAPI.getIncidents({ 
        userId: user.id,
        limit: 5,
        sort: 'createdAt:desc'
      });
      setRecentIncidents(response);
    } catch (err) {
      console.error('Error fetching recent incidents:', err);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const response = await authAPI.getUserActivities(user.id);
      setRecentActivities(response.activities || []);
    } catch (err) {
      console.error('Error fetching user activities:', err);
    }
  };

  const fetchNotificationSettings = async () => {
    try {
      const response = await notificationAPI.getNotificationSettings();
      setNotificationSettings(response.settings || {
        emailNotifications: true,
        pushNotifications: true,
        incidentUpdates: true,
        systemAnnouncements: true
      });
    } catch (err) {
      console.error('Error fetching notification settings:', err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleEditProfile = () => {
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    // Сброс изменений и выход из режима редактирования
    setProfileData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      department: user.department || '',
      position: user.position || '',
      avatar: user.avatar || null
    });
    setEditMode(false);
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData({
      ...profileData,
      [name]: value
    });
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value
    });
    
    // Очистка ошибок при вводе
    if (passwordErrors[name]) {
      setPasswordErrors({
        ...passwordErrors,
        [name]: null
      });
    }
  };

  const handleNotificationSettingChange = async (setting, value) => {
    try {
      const updatedSettings = {
        ...notificationSettings,
        [setting]: value
      };
      
      setNotificationSettings(updatedSettings);
      
      await notificationAPI.updateNotificationSettings(updatedSettings);
      setSuccess('Настройки уведомлений обновлены');
    } catch (err) {
      console.error('Error updating notification settings:', err);
      setError('Не удалось обновить настройки уведомлений');
    }
  };

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData({
          ...profileData,
          avatar: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const validateProfileData = () => {
    let isValid = true;
    
    if (!profileData.firstName.trim()) {
      setError('Имя не может быть пустым');
      isValid = false;
    } else if (!profileData.lastName.trim()) {
      setError('Фамилия не может быть пустой');
      isValid = false;
    } else if (!profileData.email.trim()) {
      setError('Email не может быть пустым');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      setError('Введите корректный email адрес');
      isValid = false;
    }
    
    return isValid;
  };

  const validatePasswordData = () => {
    const errors = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Введите текущий пароль';
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = 'Введите новый пароль';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Пароль должен содержать не менее 8 символов';
    }
    
    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Подтвердите новый пароль';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Пароли не совпадают';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfileData()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const updatedUser = await authAPI.updateProfile(profileData);
      updateUserInfo(updatedUser);
      setEditMode(false);
      setSuccess('Профиль успешно обновлен');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Не удалось обновить профиль');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPasswordDialog = () => {
    setPasswordDialogOpen(true);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordErrors({});
  };

  const handleClosePasswordDialog = () => {
    setPasswordDialogOpen(false);
  };

  const handleChangePassword = async () => {
    if (!validatePasswordData()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setPasswordDialogOpen(false);
      setSuccess('Пароль успешно изменен');
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err.response?.data?.message || 'Не удалось изменить пароль');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Вы уверены, что хотите выйти?')) {
      logout();
      navigate('/login');
    }
  };

  const handleCloseSnackbar = () => {
    setSuccess(null);
    setError(null);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Профиль пользователя
        </Typography>
        
        <Paper elevation={3} sx={{ p: 0, mb: 4 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Личная информация" icon={<PersonIcon />} />
            <Tab label="Активность" icon={<HistoryIcon />} />
            <Tab label="Уведомления" icon={<NotificationsIcon />} />
          </Tabs>
          
          {/* Личная информация */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Avatar
                  src={profileData.avatar}
                  alt={`${profileData.firstName} ${profileData.lastName}`}
                  sx={{ width: 150, height: 150, mb: 2 }}
                />
                
                {editMode && (
                  <Button
                    variant="outlined"
                    component="label"
                    sx={{ mb: 2 }}
                  >
                    Изменить фото
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleAvatarChange}
                    />
                  </Button>
                )}
                
                <Card sx={{ width: '100%', mb: 2 }}>
                  <CardHeader title="Информация о пользователе" />
                  <CardContent>
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          <BadgeIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary="Роль"
                          secondary={user?.role === 'admin' ? 'Администратор' : 
                                    user?.role === 'support' ? 'Техническая поддержка' : 
                                    user?.role === 'user' ? 'Пользователь' : 'Не указана'}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <WorkIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary="Отдел"
                          secondary={user?.department || 'Не указан'}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <HistoryIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary="Дата регистрации"
                          secondary={user?.createdAt ? formatDate(user.createdAt) : 'Не указана'}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
                
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<PasswordIcon />}
                  onClick={handleOpenPasswordDialog}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Изменить пароль
                </Button>
                
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleLogout}
                  fullWidth
                >
                  Выйти из системы
                </Button>
              </Grid>
              
              <Grid item xs={12} md={8}>
                <Card sx={{ mb: 3 }}>
                  <CardHeader 
                    title="Персональные данные" 
                    action={
                      !editMode ? (
                        <IconButton onClick={handleEditProfile}>
                          <EditIcon />
                        </IconButton>
                      ) : null
                    }
                  />
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Имя"
                          name="firstName"
                          value={profileData.firstName}
                          onChange={handleInputChange}
                          fullWidth
                          disabled={!editMode}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Фамилия"
                          name="lastName"
                          value={profileData.lastName}
                          onChange={handleInputChange}
                          fullWidth
                          disabled={!editMode}
                          required
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Email"
                          name="email"
                          type="email"
                          value={profileData.email}
                          onChange={handleInputChange}
                          fullWidth
                          disabled={!editMode}
                          required
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Телефон"
                          name="phone"
                          value={profileData.phone}
                          onChange={handleInputChange}
                          fullWidth
                          disabled={!editMode}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Отдел"
                          name="department"
                          value={profileData.department}
                          onChange={handleInputChange}
                          fullWidth
                          disabled={!editMode}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Должность"
                          name="position"
                          value={profileData.position}
                          onChange={handleInputChange}
                          fullWidth
                          disabled={!editMode}
                        />
                      </Grid>
                    </Grid>
                    
                    {editMode && (
                      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Button
                          variant="outlined"
                          color="secondary"
                          startIcon={<CancelIcon />}
                          onClick={handleCancelEdit}
                        >
                          Отмена
                        </Button>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <SaveIcon />}
                          onClick={handleSaveProfile}
                          disabled={loading}
                        >
                          Сохранить
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader title="Последние инциденты" />
                  <CardContent>
                    {recentIncidents.length > 0 ? (
                      <List>
                        {recentIncidents.map((incident) => (
                          <ListItem 
                            key={incident.id}
                            button
                            onClick={() => navigate(`/incidents/${incident.id}`)}
                            divider
                          >
                            <ListItemText
                              primary={incident.title}
                              secondary={`Создан: ${formatDate(incident.createdAt)}`}
                            />
                            <StatusBadge status={incident.status} />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        У вас нет активных инцидентов
                      </Typography>
                    )}
                    
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="text"
                        color="primary"
                        onClick={() => navigate('/incidents')}
                      >
                        Все инциденты
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
          
          {/* Активность */}
          <TabPanel value={tabValue} index={1}>
            <Card>
              <CardHeader title="История активности" />
              <CardContent>
                {recentActivities.length > 0 ? (
                  <List>
                    {recentActivities.map((activity, index) => (
                      <ListItem key={index} divider={index < recentActivities.length - 1}>
                        <ListItemText
                          primary={activity.description}
                          secondary={formatDate(activity.timestamp)}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    История активности пуста
                  </Typography>
                )}
              </CardContent>
            </Card>
          </TabPanel>
          
          {/* Уведомления */}
          <TabPanel value={tabValue} index={2}>
            <Card>
              <CardHeader title="Настройки уведомлений" />
              <CardContent>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Email уведомления"
                      secondary="Получать уведомления на электронную почту"
                    />
                    <Select
                      value={notificationSettings.emailNotifications}
                      onChange={(e) => handleNotificationSettingChange('emailNotifications', e.target.value)}
                    >
                      <MenuItem value={true}>Включено</MenuItem>
                      <MenuItem value={false}>Выключено</MenuItem>
                    </Select>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="Push-уведомления"
                      secondary="Получать уведомления в браузере"
                    />
                    <Select
                      value={notificationSettings.pushNotifications}
                      onChange={(e) => handleNotificationSettingChange('pushNotifications', e.target.value)}
                    >
                      <MenuItem value={true}>Включено</MenuItem>
                      <MenuItem value={false}>Выключено</MenuItem>
                    </Select>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="Обновления инцидентов"
                      secondary="Получать уведомления об изменениях в инцидентах"
                    />
                    <Select
                      value={notificationSettings.incidentUpdates}
                      onChange={(e) => handleNotificationSettingChange('incidentUpdates', e.target.value)}
                    >
                      <MenuItem value={true}>Включено</MenuItem>
                      <MenuItem value={false}>Выключено</MenuItem>
                    </Select>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="Системные объявления"
                      secondary="Получать уведомления о системных обновлениях"
                    />
                    <Select
                      value={notificationSettings.systemAnnouncements}
                      onChange={(e) => handleNotificationSettingChange('systemAnnouncements', e.target.value)}
                    >
                      <MenuItem value={true}>Включено</MenuItem>
                      <MenuItem value={false}>Выключено</MenuItem>
                    </Select>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
            
            <Card sx={{ mt: 3 }}>
              <CardHeader title="Последние уведомления" />
              <CardContent>
                {notifications && notifications.length > 0 ? (
                  <List>
                    {notifications.slice(0, 5).map((notification) => (
                      <ListItem key={notification.id} divider>
                        <ListItemIcon>
                          <NotificationsIcon color={notification.read ? 'disabled' : 'primary'} />
                        </ListItemIcon>
                        <ListItemText
                          primary={notification.title}
                          secondary={
                            <>
                              <Typography variant="body2" component="span">
                                {notification.message}
                              </Typography>
                              <br />
                              <Typography variant="caption" color="textSecondary">
                                {formatDate(notification.createdAt)}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    У вас нет новых уведомлений
                  </Typography>
                )}
              </CardContent>
            </Card>
          </TabPanel>
        </Paper>
      </Box>
      
      {/* Диалог смены пароля */}
      <Dialog open={passwordDialogOpen} onClose={handleClosePasswordDialog}>
        <DialogTitle>Изменение пароля</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Для изменения пароля введите текущий пароль и новый пароль дважды.
          </DialogContentText>
          <TextField
            margin="dense"
            name="currentPassword"
            label="Текущий пароль"
            type="password"
            fullWidth
            value={passwordData.currentPassword}
            onChange={handlePasswordInputChange}
            error={!!passwordErrors.currentPassword}
            helperText={passwordErrors.currentPassword}
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            name="newPassword"
            label="Новый пароль"
            type="password"
            fullWidth
            value={passwordData.newPassword}
            onChange={handlePasswordInputChange}
            error={!!passwordErrors.newPassword}
            helperText={passwordErrors.newPassword}
          />
          <TextField
            margin="dense"
            name="confirmPassword"
            label="Подтверждение пароля"
            type="password"
            fullWidth
            value={passwordData.confirmPassword}
            onChange={handlePasswordInputChange}
            error={!!passwordErrors.confirmPassword}
            helperText={passwordErrors.confirmPassword}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePasswordDialog} color="secondary">
            Отмена
          </Button>
          <Button 
            onClick={handleChangePassword} 
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Изменить пароль'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Уведомления */}
      <Snackbar open={!!success} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
      
      <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProfilePage;