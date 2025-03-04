import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Box,
  Divider,
  Chip,
  TextField,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  History as HistoryIcon,
  Assignment as AssignmentIcon,
  Computer as ComputerIcon,
  Print as PrintIcon,
  QrCode as QrCodeIcon,
  AttachFile as AttachFileIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { AuthContext } from '../contexts/AuthContext';
import EquipmentAPI from '../api/equipmentAPI';
import IncidentAPI from '../api/incidentAPI';
import StatusBadge from '../components/StatusBadge';
import EquipmentForm from '../components/EquipmentForm';
import DataTable from '../components/DataTable';
import { formatDate, formatCurrency } from '../utils/formatters';

// Компонент для отображения истории изменений оборудования
const HistoryTab = ({ history }) => {
  if (!history || history.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="textSecondary">
          История изменений отсутствует
        </Typography>
      </Box>
    );
  }

  return (
    <List>
      {history.map((entry, index) => (
        <React.Fragment key={index}>
          <ListItem alignItems="flex-start">
            <ListItemIcon>
              <HistoryIcon />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="subtitle1">
                  {entry.action}
                  <Chip 
                    size="small" 
                    label={formatDate(entry.timestamp)} 
                    sx={{ ml: 1 }} 
                  />
                </Typography>
              }
              secondary={
                <>
                  <Typography variant="body2" component="span">
                    {entry.description}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Пользователь: {entry.user}
                  </Typography>
                </>
              }
            />
          </ListItem>
          {index < history.length - 1 && <Divider variant="inset" component="li" />}
        </React.Fragment>
      ))}
    </List>
  );
};

// Компонент для отображения связанных инцидентов
const IncidentsTab = ({ incidents, onViewIncident }) => {
  const columns = [
    { id: 'id', label: 'ID', minWidth: 50 },
    { id: 'title', label: 'Название', minWidth: 200 },
    { 
      id: 'status', 
      label: 'Статус', 
      minWidth: 120,
      render: (value) => <StatusBadge status={value} type="incident" />
    },
    { 
      id: 'priority', 
      label: 'Приоритет', 
      minWidth: 120,
      render: (value) => <Chip 
        label={value} 
        color={
          value === 'high' ? 'error' : 
          value === 'medium' ? 'warning' : 
          'success'
        } 
        size="small" 
      />
    },
    { 
      id: 'created_at', 
      label: 'Создан', 
      minWidth: 120,
      render: (value) => formatDate(value)
    },
    { 
      id: 'actions', 
      label: 'Действия', 
      minWidth: 100,
      render: (_, row) => (
        <Button 
          size="small" 
          variant="outlined" 
          onClick={() => onViewIncident(row.id)}
        >
          Просмотр
        </Button>
      )
    }
  ];

  if (!incidents || incidents.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="textSecondary">
          Связанные инциденты отсутствуют
        </Typography>
      </Box>
    );
  }

  return <DataTable columns={columns} data={incidents} />;
};

// Компонент для отображения документов и вложений
const AttachmentsTab = ({ attachments, onAddAttachment, onDeleteAttachment, canEdit }) => {
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    try {
      await onAddAttachment(file, description);
      setFile(null);
      setDescription('');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {canEdit && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Добавить вложение
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={5}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFileIcon />}
                fullWidth
              >
                Выбрать файл
                <input
                  type="file"
                  hidden
                  onChange={handleFileChange}
                />
              </Button>
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField
                label="Описание"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpload}
                disabled={!file || uploading}
                startIcon={uploading ? <CircularProgress size={20} /> : <SaveIcon />}
                fullWidth
              >
                Загрузить
              </Button>
            </Grid>
          </Grid>
          {file && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Выбран файл: {file.name}
            </Typography>
          )}
        </Paper>
      )}

      {(!attachments || attachments.length === 0) ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="body1" color="textSecondary">
            Вложения отсутствуют
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {attachments.map((attachment) => (
            <Grid item xs={12} sm={6} md={4} key={attachment.id}>
              <Card>
                <CardHeader
                  title={attachment.filename}
                  subheader={formatDate(attachment.uploaded_at)}
                  action={
                    canEdit && (
                      <IconButton 
                        aria-label="delete" 
                        onClick={() => onDeleteAttachment(attachment.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )
                  }
                />
                <CardContent>
                  <Typography variant="body2" color="textSecondary">
                    {attachment.description || 'Без описания'}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Скачать
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

// Основной компонент страницы детальной информации об оборудовании
const EquipmentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editing, setEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [relatedIncidents, setRelatedIncidents] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [history, setHistory] = useState([]);
  const [attachments, setAttachments] = useState([]);

  // Проверка прав доступа
  const canEdit = user && (user.role === 'admin' || user.role === 'support');
  const canDelete = user && user.role === 'admin';

  // Загрузка данных оборудования
  useEffect(() => {
    const fetchEquipmentData = async () => {
      setLoading(true);
      try {
        const data = await EquipmentAPI.getEquipmentById(id);
        setEquipment(data);
        
        // Загрузка связанных инцидентов
        const incidents = await IncidentAPI.getIncidentsByEquipment(id);
        setRelatedIncidents(incidents);
        
        // Загрузка истории изменений
        const historyData = await EquipmentAPI.getEquipmentHistory(id);
        setHistory(historyData);
        
        // Загрузка вложений
        const attachmentsData = await EquipmentAPI.getEquipmentAttachments(id);
        setAttachments(attachmentsData);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching equipment details:', err);
        setError('Не удалось загрузить информацию об оборудовании. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };

    fetchEquipmentData();
  }, [id]);

  // Обработчик изменения вкладки
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Обработчик обновления оборудования
  const handleUpdateEquipment = async (updatedData) => {
    try {
      await EquipmentAPI.updateEquipment(id, updatedData);
      const updatedEquipment = await EquipmentAPI.getEquipmentById(id);
      setEquipment(updatedEquipment);
      setEditing(false);
      setSuccess('Информация об оборудовании успешно обновлена');
      
      // Обновление истории изменений
      const historyData = await EquipmentAPI.getEquipmentHistory(id);
      setHistory(historyData);
    } catch (err) {
      console.error('Error updating equipment:', err);
      setError('Не удалось обновить информацию об оборудовании. Пожалуйста, попробуйте позже.');
    }
  };

  // Обработчик удаления оборудования
  const handleDeleteEquipment = async () => {
    try {
      await EquipmentAPI.deleteEquipment(id);
      setDeleteDialogOpen(false);
      setSuccess('Оборудование успешно удалено');
      // Перенаправление на страницу со списком оборудования после небольшой задержки
      setTimeout(() => {
        navigate('/equipment');
      }, 1500);
    } catch (err) {
      console.error('Error deleting equipment:', err);
      setError('Не удалось удалить оборудование. Пожалуйста, попробуйте позже.');
      setDeleteDialogOpen(false);
    }
  };

  // Обработчик добавления вложения
  const handleAddAttachment = async (file, description) => {
    try {
      await EquipmentAPI.addEquipmentAttachment(id, file, description);
      const attachmentsData = await EquipmentAPI.getEquipmentAttachments(id);
      setAttachments(attachmentsData);
      setSuccess('Вложение успешно добавлено');
    } catch (err) {
      console.error('Error adding attachment:', err);
      setError('Не удалось добавить вложение. Пожалуйста, попробуйте позже.');
    }
  };

  // Обработчик удаления вложения
  const handleDeleteAttachment = async (attachmentId) => {
    if (window.confirm('Вы уверены, что хотите удалить это вложение?')) {
      try {
        await EquipmentAPI.deleteEquipmentAttachment(id, attachmentId);
        const attachmentsData = await EquipmentAPI.getEquipmentAttachments(id);
        setAttachments(attachmentsData);
        setSuccess('Вложение успешно удалено');
      } catch (err) {
        console.error('Error deleting attachment:', err);
        setError('Не удалось удалить вложение. Пожалуйста, попробуйте позже.');
      }
    }
  };

  // Обработчик печати QR-кода
  const handlePrintQRCode = async () => {
    try {
      const response = await EquipmentAPI.generateEquipmentQRCode(id);
      // Открытие нового окна для печати QR-кода
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>QR-код для оборудования #${id}</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; }
              .container { margin: 50px auto; max-width: 500px; }
              img { max-width: 100%; height: auto; }
              h2 { margin-bottom: 20px; }
              p { margin-top: 20px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>QR-код для оборудования #${id}</h2>
              <img src="${response.qrCodeUrl}" alt="QR-код" />
              <p>${equipment.name} (${equipment.inventory_number})</p>
              <p>Отсканируйте QR-код для получения информации об оборудовании</p>
            </div>
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError('Не удалось сгенерировать QR-код. Пожалуйста, попробуйте позже.');
    }
  };

  // Обработчик перехода к инциденту
  const handleViewIncident = (incidentId) => {
    navigate(`/incidents/${incidentId}`);
  };

  // Обработчик создания нового инцидента для этого оборудования
  const handleCreateIncident = () => {
    navigate('/incidents/new', { state: { equipmentId: id } });
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error && !equipment) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Alert severity="error">{error}</Alert>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              component={Link}
              to="/equipment"
            >
              Вернуться к списку оборудования
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
            component={Link}
            to="/equipment"
          >
            Назад к списку
          </Button>
          <Box>
            {canEdit && !editing && (
              <>
                <Tooltip title="Печать QR-кода">
                  <IconButton 
                    color="primary" 
                    onClick={handlePrintQRCode}
                    sx={{ mr: 1 }}
                  >
                    <QrCodeIcon />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => setEditing(true)}
                  sx={{ mr: 1 }}
                >
                  Редактировать
                </Button>
              </>
            )}
            {canDelete && !editing && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteDialogOpen(true)}
              >
                Удалить
              </Button>
            )}
            {editing && (
              <>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<CancelIcon />}
                  onClick={() => setEditing(false)}
                  sx={{ mr: 1 }}
                >
                  Отмена
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* Уведомления */}
        <Snackbar 
          open={!!success} 
          autoHideDuration={6000} 
          onClose={() => setSuccess(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>
        
        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>

        {/* Диалог подтверждения удаления */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Подтверждение удаления</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Вы уверены, что хотите удалить оборудование "{equipment?.name}"? 
              Это действие нельзя будет отменить.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
              Отмена
            </Button>
            <Button onClick={handleDeleteEquipment} color="error" autoFocus>
              Удалить
            </Button>
          </DialogActions>
        </Dialog>

        {/* Основное содержимое */}
        {editing ? (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Редактирование оборудования
            </Typography>
            <EquipmentForm 
              initialData={equipment} 
              onSubmit={handleUpdateEquipment} 
              isEditing={true}
            />
          </Paper>
        ) : (
          <>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Typography variant="h4" gutterBottom>
                    {equipment.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <StatusBadge status={equipment.status} type="equipment" />
                    <Typography variant="body2" sx={{ ml: 2 }}>
                      Инвентарный номер: {equipment.inventory_number}
                    </Typography>
                  </Box>
                  <Typography variant="body1" paragraph>
                    {equipment.description}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Основная информация
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Тип" 
                            secondary={equipment.type} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Модель" 
                            secondary={equipment.model} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Серийный номер" 
                            secondary={equipment.serial_number} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Дата приобретения" 
                            secondary={formatDate(equipment.purchase_date)} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Стоимость" 
                            secondary={formatCurrency(equipment.purchase_cost)} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Местоположение" 
                            secondary={equipment.location} 
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {equipment.assigned_to && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Ответственное лицо
                  </Typography>
                  <Paper sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body1">
                          {equipment.assigned_to.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {equipment.assigned_to.email}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2">
                          Отдел: {equipment.assigned_to.department}
                        </Typography>
                        <Typography variant="body2">
                          Дата назначения: {formatDate(equipment.assignment_date)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Box>
              )}

              {/* Технические характеристики */}
              {equipment.specifications && Object.keys(equipment.specifications).length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Технические характеристики
                  </Typography>
                  <Paper sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                      {Object.entries(equipment.specifications).map(([key, value]) => (
                        <Grid item xs={12} sm={6} md={4} key={key}>
                          <Typography variant="subtitle2">{key}</Typography>
                          <Typography variant="body2">{value}</Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </Box>
              )}

              {/* Кнопка создания инцидента */}
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AssignmentIcon />}
                  onClick={handleCreateIncident}
                >
                  Создать инцидент для этого оборудования
                </Button>
              </Box>
            </Paper>

            {/* Вкладки с дополнительной информацией */}
            <Paper sx={{ mb: 3 }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
              >
                <Tab label="История изменений" icon={<HistoryIcon />} iconPosition="start" />
                <Tab label="Связанные инциденты" icon={<AssignmentIcon />} iconPosition="start" />
                <Tab label="Вложения" icon={<AttachFileIcon />} iconPosition="start" />
              </Tabs>
              <Box sx={{ p: 2 }}>
                {tabValue === 0 && (
                  <HistoryTab history={history} />
                )}
                {tabValue === 1 && (
                  <IncidentsTab 
                    incidents={relatedIncidents} 
                    onViewIncident={handleViewIncident} 
                  />
                )}
                {tabValue === 2 && (
                  <AttachmentsTab 
                    attachments={attachments}
                    onAddAttachment={handleAddAttachment}
                    onDeleteAttachment={handleDeleteAttachment}
                    canEdit={canEdit}
                  />
                )}
              </Box>
            </Paper>
          </>
        )}
      </Box>
    </Container>
  );
};

export default EquipmentDetailPage;