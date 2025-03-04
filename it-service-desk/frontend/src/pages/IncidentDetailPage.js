import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Box,
  Button,
  Chip,
  Divider,
  TextField,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Assignment as AssignmentIcon,
  Computer as ComputerIcon,
  History as HistoryIcon,
  AttachFile as AttachFileIcon,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  PriorityHigh as PriorityHighIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { AuthContext } from '../contexts/AuthContext';
import IncidentAPI from '../api/incidentAPI';
import EquipmentAPI from '../api/equipmentAPI';
import StatusBadge from '../components/StatusBadge';
import IncidentForm from '../components/incidents/IncidentForm';
import CommentForm from '../components/incidents/CommentForm';
import FileUpload from '../components/common/FileUpload';
import HistoryTimeline from '../components/incidents/HistoryTimeline';
import { formatDateTime } from '../utils/formatters';

// Компонент для отображения детальной информации об инциденте
const IncidentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  // Состояния
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [relatedEquipment, setRelatedEquipment] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Загрузка данных инцидента
  useEffect(() => {
    const fetchIncidentData = async () => {
      setLoading(true);
      try {
        const data = await IncidentAPI.getIncidentById(id);
        setIncident(data);
        
        // Загрузка комментариев
        const commentsData = await IncidentAPI.getIncidentComments(id);
        setComments(commentsData);
        
        // Загрузка истории изменений
        const historyData = await IncidentAPI.getIncidentHistory(id);
        setHistory(historyData);
        
        // Загрузка вложений
        const attachmentsData = await IncidentAPI.getIncidentAttachments(id);
        setAttachments(attachmentsData);
        
        // Если есть связанное оборудование, загружаем его данные
        if (data.equipment_id) {
          const equipmentData = await EquipmentAPI.getEquipmentById(data.equipment_id);
          setRelatedEquipment(equipmentData);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching incident details:', err);
        setError('Не удалось загрузить данные инцидента. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };

    fetchIncidentData();
  }, [id]);

  // Обработчик изменения вкладки
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Обработчик обновления инцидента
  const handleUpdateIncident = async (updatedData) => {
    try {
      await IncidentAPI.updateIncident(id, updatedData);
      
      // Обновляем данные инцидента
      const updatedIncident = await IncidentAPI.getIncidentById(id);
      setIncident(updatedIncident);
      
      // Обновляем историю изменений
      const historyData = await IncidentAPI.getIncidentHistory(id);
      setHistory(historyData);
      
      setShowEditForm(false);
      setSnackbar({
        open: true,
        message: 'Инцидент успешно обновлен',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error updating incident:', err);
      setSnackbar({
        open: true,
        message: 'Ошибка при обновлении инцидента',
        severity: 'error'
      });
    }
  };

  // Обработчик удаления инцидента
  const handleDeleteIncident = async () => {
    try {
      await IncidentAPI.deleteIncident(id);
      setShowDeleteDialog(false);
      setSnackbar({
        open: true,
        message: 'Инцидент успешно удален',
        severity: 'success'
      });
      // Перенаправляем на страницу со списком инцидентов
      setTimeout(() => {
        navigate('/incidents');
      }, 1500);
    } catch (err) {
      console.error('Error deleting incident:', err);
      setSnackbar({
        open: true,
        message: 'Ошибка при удалении инцидента',
        severity: 'error'
      });
      setShowDeleteDialog(false);
    }
  };

  // Обработчик добавления комментария
  const handleAddComment = async (commentData) => {
    try {
      await IncidentAPI.addIncidentComment(id, commentData);
      
      // Обновляем список комментариев
      const commentsData = await IncidentAPI.getIncidentComments(id);
      setComments(commentsData);
      
      setSnackbar({
        open: true,
        message: 'Комментарий успешно добавлен',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error adding comment:', err);
      setSnackbar({
        open: true,
        message: 'Ошибка при добавлении комментария',
        severity: 'error'
      });
    }
  };

  // Обработчик загрузки файла
  const handleFileUpload = async (files) => {
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      
      await IncidentAPI.uploadIncidentAttachment(id, formData);
      
      // Обновляем список вложений
      const attachmentsData = await IncidentAPI.getIncidentAttachments(id);
      setAttachments(attachmentsData);
      
      setSnackbar({
        open: true,
        message: 'Файлы успешно загружены',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error uploading files:', err);
      setSnackbar({
        open: true,
        message: 'Ошибка при загрузке файлов',
        severity: 'error'
      });
    }
  };

  // Обработчик удаления вложения
  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await IncidentAPI.deleteIncidentAttachment(id, attachmentId);
      
      // Обновляем список вложений
      const attachmentsData = await IncidentAPI.getIncidentAttachments(id);
      setAttachments(attachmentsData);
      
      setSnackbar({
        open: true,
        message: 'Файл успешно удален',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error deleting attachment:', err);
      setSnackbar({
        open: true,
        message: 'Ошибка при удалении файла',
        severity: 'error'
      });
    }
  };

  // Обработчик изменения статуса инцидента
  const handleStatusChange = async (newStatus) => {
    try {
      await IncidentAPI.updateIncidentStatus(id, { status: newStatus });
      
      // Обновляем данные инцидента
      const updatedIncident = await IncidentAPI.getIncidentById(id);
      setIncident(updatedIncident);
      
      // Обновляем историю изменений
      const historyData = await IncidentAPI.getIncidentHistory(id);
      setHistory(historyData);
      
      setSnackbar({
        open: true,
        message: `Статус инцидента изменен на "${newStatus}"`,
        severity: 'success'
      });
    } catch (err) {
      console.error('Error updating incident status:', err);
      setSnackbar({
        open: true,
        message: 'Ошибка при изменении статуса инцидента',
        severity: 'error'
      });
    }
  };

  // Проверка прав доступа
  const canEdit = user && (user.role === 'admin' || user.role === 'support' || 
    (incident && incident.created_by === user.id));
  const canDelete = user && (user.role === 'admin' || 
    (incident && incident.created_by === user.id && incident.status === 'open'));
  const canChangeStatus = user && (user.role === 'admin' || user.role === 'support');

  // Если данные загружаются, показываем индикатор загрузки
  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Если произошла ошибка, показываем сообщение об ошибке
  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/incidents')}
            >
              Вернуться к списку инцидентов
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }

  // Если инцидент не найден, показываем сообщение
  if (!incident) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Alert severity="warning">Инцидент не найден</Alert>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/incidents')}
            >
              Вернуться к списку инцидентов
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        {/* Верхняя панель с кнопками */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/incidents')}
          >
            Назад к списку
          </Button>
          <Box>
            {canEdit && (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setShowEditForm(true)}
                sx={{ mr: 1 }}
              >
                Редактировать
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setShowDeleteDialog(true)}
              >
                Удалить
              </Button>
            )}
          </Box>
        </Box>

        {/* Заголовок и статус */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <Typography variant="h4" component="h1" gutterBottom>
                {incident.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                  ID: {incident.id}
                </Typography>
                <StatusBadge status={incident.status} />
                <Chip 
                  label={`Приоритет: ${incident.priority}`} 
                  color={
                    incident.priority === 'high' ? 'error' : 
                    incident.priority === 'medium' ? 'warning' : 'info'
                  }
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              {canChangeStatus && (
                <Box>
                  {incident.status === 'open' && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleStatusChange('in_progress')}
                      sx={{ mr: 1 }}
                    >
                      Взять в работу
                    </Button>
                  )}
                  {incident.status === 'in_progress' && (
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleStatusChange('resolved')}
                      sx={{ mr: 1 }}
                    >
                      Решено
                    </Button>
                  )}
                  {incident.status === 'resolved' && (
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleStatusChange('closed')}
                      sx={{ mr: 1 }}
                    >
                      Закрыть
                    </Button>
                  )}
                  {(incident.status === 'resolved' || incident.status === 'closed') && (
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={() => handleStatusChange('reopened')}
                    >
                      Переоткрыть
                    </Button>
                  )}
                </Box>
              )}
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Информация о создании и назначении */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon color="action" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Создал
                  </Typography>
                  <Typography variant="body2">
                    {incident.created_by_name || 'Не указано'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon color="action" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Назначено
                  </Typography>
                  <Typography variant="body2">
                    {incident.assigned_to_name || 'Не назначено'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AccessTimeIcon color="action" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Создано
                  </Typography>
                  <Typography variant="body2">
                    {formatDateTime(incident.created_at)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AccessTimeIcon color="action" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Обновлено
                  </Typography>
                  <Typography variant="body2">
                    {formatDateTime(incident.updated_at)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Вкладки с информацией */}
        <Paper elevation={3} sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Описание" />
            <Tab label="Комментарии" />
            <Tab label="История" />
            <Tab label="Вложения" />
          </Tabs>
          
          {/* Содержимое вкладки "Описание" */}
          {tabValue === 0 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Описание проблемы
              </Typography>
              <Typography variant="body1" paragraph>
                {incident.description || 'Описание отсутствует'}
              </Typography>
              
              {relatedEquipment && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Связанное оборудование
                  </Typography>
                  <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardHeader
                      avatar={
                        <Avatar>
                          <ComputerIcon />
                        </Avatar>
                      }
                      title={relatedEquipment.name}
                      subheader={`Инвентарный номер: ${relatedEquipment.inventory_number}`}
                    />
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            Тип: {relatedEquipment.type}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            Статус: {relatedEquipment.status}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            Местоположение: {relatedEquipment.location || 'Не указано'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                    <Box sx={{ p: 2 }}>
                      <Button
                        component={Link}
                        to={`/equipment/${relatedEquipment.id}`}
                        variant="outlined"
                        size="small"
                      >
                        Подробнее об оборудовании
                      </Button>
                    </Box>
                  </Card>
                </>
              )}
              
              {incident.resolution && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Решение
                  </Typography>
                  <Typography variant="body1">
                    {incident.resolution}
                  </Typography>
                </>
              )}
            </Box>
          )}
          
          {/* Содержимое вкладки "Комментарии" */}
          {tabValue === 1 && (
            <Box sx={{ p: 3 }}>
              <List>
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <ListItem key={comment.id} alignItems="flex-start" divider>
                      <ListItemAvatar>
                        <Avatar>{comment.author_name.charAt(0).toUpperCase()}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle1">
                              {comment.author_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDateTime(comment.created_at)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography
                            variant="body2"
                            color="text.primary"
                            sx={{ mt: 1 }}
                          >
                            {comment.content}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      Комментариев пока нет
                    </Typography>
                  </Box>
                )}
              </List>
              
              {/* Форма добавления комментария */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Добавить комментарий
                </Typography>
                <CommentForm onSubmit={handleAddComment} />
              </Box>
            </Box>
          )}
          
          {/* Содержимое вкладки "История" */}
          {tabValue === 2 && (
            <Box sx={{ p: 3 }}>
              {history.length > 0 ? (
                <HistoryTimeline history={history} />
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    История изменений пуста
                  </Typography>
                </Box>
              )}
            </Box>
          )}
          
          {/* Содержимое вкладки "Вложения" */}
          {tabValue === 3 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Загрузить файлы
              </Typography>
              <FileUpload onUpload={handleFileUpload} />
              
              <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                Прикрепленные файлы
              </Typography>
              {attachments.length > 0 ? (
                <List>
                  {attachments.map((attachment) => (
                    <ListItem
                      key={attachment.id}
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => handleDeleteAttachment(attachment.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar>
                          <AttachFileIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={attachment.filename}
                        secondary={
                          <>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.primary"
                            >
                              {`${(attachment.file_size / 1024).toFixed(2)} KB`}
                            </Typography>
                            {` — Загружен ${formatDateTime(attachment.uploaded_at)}`}
                          </>
                        }
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        href={attachment.file_url}
                        target="_blank"
                        sx={{ mr: 2 }}
                      >
                        Скачать
                      </Button>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    Нет прикрепленных файлов
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Box>

      {/* Диалог редактирования инцидента */}
      <Dialog
        open={showEditForm}
        onClose={() => setShowEditForm(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Редактирование инцидента</DialogTitle>
        <DialogContent>
          <IncidentForm
            initialData={incident}
            onSubmit={handleUpdateIncident}
            onCancel={() => setShowEditForm(false)}
            isEdit={true}
          />
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      >
        <DialogTitle>Удаление инцидента</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что хотите удалить этот инцидент? Это действие нельзя будет отменить.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Отмена</Button>
          <Button onClick={handleDeleteIncident} color="error">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar для уведомлений */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default IncidentDetailPage;