import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormHelperText, 
  Grid, 
  Paper, 
  Divider, 
  Chip, 
  CircularProgress,
  Autocomplete,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Save as SaveIcon, 
  Cancel as CancelIcon, 
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  PriorityHigh as PriorityHighIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import incidentAPI from '../api/incidentAPI';
import equipmentAPI from '../api/equipmentAPI';
import StatusBadge from './StatusBadge';

/**
 * Компонент формы для создания и редактирования инцидентов
 * @param {Object} props - Свойства компонента
 * @param {Object} props.incident - Объект инцидента для редактирования (опционально)
 * @param {Function} props.onSubmit - Функция обратного вызова после отправки формы
 * @param {Function} props.onCancel - Функция обратного вызова при отмене
 * @param {boolean} props.isEdit - Флаг режима редактирования
 */
const IncidentForm = ({ incident = null, onSubmit, onCancel, isEdit = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [equipmentOptions, setEquipmentOptions] = useState([]);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  // Определение статусов инцидентов
  const incidentStatuses = [
    { value: 'new', label: 'New' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
  ];

  // Определение приоритетов инцидентов
  const incidentPriorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ];

  // Определение типов инцидентов
  const incidentTypes = [
    { value: 'hardware', label: 'Hardware Issue' },
    { value: 'software', label: 'Software Issue' },
    { value: 'network', label: 'Network Issue' },
    { value: 'access', label: 'Access/Permission Issue' },
    { value: 'service', label: 'Service Request' },
    { value: 'other', label: 'Other' }
  ];

  // Схема валидации формы с использованием Yup
  const validationSchema = Yup.object({
    title: Yup.string()
      .required('Title is required')
      .min(5, 'Title should be at least 5 characters')
      .max(100, 'Title should not exceed 100 characters'),
    description: Yup.string()
      .required('Description is required')
      .min(10, 'Description should be at least 10 characters'),
    priority: Yup.string()
      .required('Priority is required')
      .oneOf(incidentPriorities.map(p => p.value), 'Invalid priority'),
    type: Yup.string()
      .required('Type is required')
      .oneOf(incidentTypes.map(t => t.value), 'Invalid type'),
    status: Yup.string()
      .required('Status is required')
      .oneOf(incidentStatuses.map(s => s.value), 'Invalid status'),
    assignee_id: Yup.number()
      .nullable()
      .when('status', {
        is: (status) => ['assigned', 'in_progress', 'on_hold'].includes(status),
        then: Yup.number().required('Assignee is required when status is Assigned, In Progress, or On Hold')
      }),
    equipment_id: Yup.number().nullable(),
    reporter_id: Yup.number().required('Reporter is required')
  });

  // Инициализация Formik
  const formik = useFormik({
    initialValues: {
      title: incident?.title || '',
      description: incident?.description || '',
      priority: incident?.priority || 'medium',
      type: incident?.type || 'hardware',
      status: incident?.status || 'new',
      assignee_id: incident?.assignee_id || null,
      equipment_id: incident?.equipment_id || null,
      reporter_id: incident?.reporter_id || user?.id || null,
      resolution_notes: incident?.resolution_notes || ''
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const formData = new FormData();
        
        // Добавляем все поля формы в FormData
        Object.keys(values).forEach(key => {
          if (values[key] !== null && values[key] !== undefined) {
            formData.append(key, values[key]);
          }
        });
        
        // Добавляем вложения, если они есть
        attachments.forEach(file => {
          formData.append('attachments', file);
        });

        let response;
        if (isEdit && incident) {
          response = await incidentAPI.updateIncident(incident.id, formData);
        } else {
          response = await incidentAPI.createIncident(formData);
        }

        if (onSubmit) {
          onSubmit(response);
        } else {
          navigate(`/incidents/${response.id}`);
        }
      } catch (error) {
        console.error('Error submitting incident:', error);
      } finally {
        setLoading(false);
      }
    }
  });

  // Загрузка списка оборудования и пользователей при монтировании компонента
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Загрузка списка оборудования
        const equipmentData = await equipmentAPI.getEquipmentList();
        setEquipmentOptions(equipmentData.items || []);

        // Загрузка списка пользователей для назначения
        const usersData = await incidentAPI.getAssignableUsers();
        setAssigneeOptions(usersData || []);

        // Если редактируем инцидент и у него есть вложения, загружаем их
        if (isEdit && incident && incident.attachments) {
          setAttachments(incident.attachments);
        }

        // Если есть equipment_id, находим соответствующее оборудование
        if (formik.values.equipment_id && equipmentData.items) {
          const equipment = equipmentData.items.find(eq => eq.id === formik.values.equipment_id);
          setSelectedEquipment(equipment || null);
        }
      } catch (error) {
        console.error('Error fetching form data:', error);
      }
    };

    fetchData();
  }, []);

  // Обработчик изменения статуса
  const handleStatusChange = (event) => {
    const newStatus = event.target.value;
    formik.setFieldValue('status', newStatus);
    
    // Если статус меняется на "resolved" или "closed", открываем диалог для ввода примечаний о решении
    if (['resolved', 'closed'].includes(newStatus) && !formik.values.resolution_notes) {
      setConfirmDialogOpen(true);
    }
  };

  // Обработчик загрузки файлов
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    setAttachments([...attachments, ...files]);
  };

  // Обработчик удаления файла
  const handleRemoveFile = (index) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
  };

  // Обработчик выбора оборудования
  const handleEquipmentChange = (event, newValue) => {
    setSelectedEquipment(newValue);
    formik.setFieldValue('equipment_id', newValue ? newValue.id : null);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        {isEdit ? 'Edit Incident' : 'Create New Incident'}
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={3}>
          {/* Заголовок инцидента */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              id="title"
              name="title"
              label="Incident Title"
              value={formik.values.title}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.title && Boolean(formik.errors.title)}
              helperText={formik.touched.title && formik.errors.title}
              placeholder="Brief description of the incident"
              variant="outlined"
            />
          </Grid>

          {/* Тип инцидента */}
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth error={formik.touched.type && Boolean(formik.errors.type)}>
              <InputLabel id="type-label">Incident Type</InputLabel>
              <Select
                labelId="type-label"
                id="type"
                name="type"
                value={formik.values.type}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                label="Incident Type"
              >
                {incidentTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
              {formik.touched.type && formik.errors.type && (
                <FormHelperText>{formik.errors.type}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          {/* Приоритет инцидента */}
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth error={formik.touched.priority && Boolean(formik.errors.priority)}>
              <InputLabel id="priority-label">Priority</InputLabel>
              <Select
                labelId="priority-label"
                id="priority"
                name="priority"
                value={formik.values.priority}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                label="Priority"
              >
                {incidentPriorities.map((priority) => (
                  <MenuItem key={priority.value} value={priority.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {priority.value === 'critical' && (
                        <PriorityHighIcon color="error" sx={{ mr: 1 }} />
                      )}
                      {priority.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              {formik.touched.priority && formik.errors.priority && (
                <FormHelperText>{formik.errors.priority}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          {/* Статус инцидента */}
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth error={formik.touched.status && Boolean(formik.errors.status)}>
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                id="status"
                name="status"
                value={formik.values.status}
                onChange={handleStatusChange}
                onBlur={formik.handleBlur}
                label="Status"
              >
                {incidentStatuses.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    <StatusBadge status={status.value} label={status.label} />
                  </MenuItem>
                ))}
              </Select>
              {formik.touched.status && formik.errors.status && (
                <FormHelperText>{formik.errors.status}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          {/* Назначенный сотрудник */}
          <Grid item xs={12} sm={6}>
            <FormControl 
              fullWidth 
              error={formik.touched.assignee_id && Boolean(formik.errors.assignee_id)}
              disabled={['new', 'closed'].includes(formik.values.status)}
            >
              <InputLabel id="assignee-label">Assignee</InputLabel>
              <Select
                labelId="assignee-label"
                id="assignee_id"
                name="assignee_id"
                value={formik.values.assignee_id || ''}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                label="Assignee"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {assigneeOptions.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </MenuItem>
                ))}
              </Select>
              {formik.touched.assignee_id && formik.errors.assignee_id && (
                <FormHelperText>{formik.errors.assignee_id}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          {/* Связанное оборудование */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              id="equipment_id"
              options={equipmentOptions}
              value={selectedEquipment}
              onChange={handleEquipmentChange}
              getOptionLabel={(option) => `${option.name} (${option.serial_number})`}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Related Equipment"
                  error={formik.touched.equipment_id && Boolean(formik.errors.equipment_id)}
                  helperText={formik.touched.equipment_id && formik.errors.equipment_id}
                />
              )}
            />
          </Grid>

          {/* Описание инцидента */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              id="description"
              name="description"
              label="Description"
              multiline
              rows={4}
              value={formik.values.description}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.description && Boolean(formik.errors.description)}
              helperText={formik.touched.description && formik.errors.description}
              placeholder="Detailed description of the incident including steps to reproduce if applicable"
              variant="outlined"
            />
          </Grid>

          {/* Примечания о решении (показываются только для resolved/closed) */}
          {['resolved', 'closed'].includes(formik.values.status) && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="resolution_notes"
                name="resolution_notes"
                label="Resolution Notes"
                multiline
                rows={3}
                value={formik.values.resolution_notes}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.resolution_notes && Boolean(formik.errors.resolution_notes)}
                helperText={formik.touched.resolution_notes && formik.errors.resolution_notes}
                placeholder="Describe how the incident was resolved"
                variant="outlined"
              />
            </Grid>
          )}

          {/* Вложения */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Attachments
            </Typography>
            <Box sx={{ mb: 2 }}>
              <input
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                style={{ display: 'none' }}
                id="attachment-button"
                type="file"
                multiple
                onChange={handleFileUpload}
              />
              <label htmlFor="attachment-button">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<AttachFileIcon />}
                >
                  Add Attachments
                </Button>
              </label>
            </Box>

            {/* Список вложений */}
            {attachments.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {attachments.map((file, index) => (
                  <Chip
                    key={index}
                    label={file.name || `File ${index + 1}`}
                    onDelete={() => handleRemoveFile(index)}
                    deleteIcon={<DeleteIcon />}
                    variant="outlined"
                  />
                ))}
              </Box>
            )}
          </Grid>

          {/* Кнопки действий */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={onCancel}
                startIcon={<CancelIcon />}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={loading ? <CircularProgress size={24} /> : <SaveIcon />}
                disabled={loading}
              >
                {isEdit ? 'Update Incident' : 'Create Incident'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>

      {/* Диалог для ввода примечаний о решении */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Resolution Notes Required</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please provide resolution notes before marking this incident as {formik.values.status}.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="resolution_notes_dialog"
            label="Resolution Notes"
            type="text"
            fullWidth
            multiline
            rows={4}
            value={formik.values.resolution_notes}
            onChange={(e) => formik.setFieldValue('resolution_notes', e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            formik.setFieldValue('status', incident?.status || 'new');
            setConfirmDialogOpen(false);
          }} color="secondary">
            Cancel
          </Button>
          <Button 
            onClick={() => setConfirmDialogOpen(false)} 
            color="primary"
            disabled={!formik.values.resolution_notes}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default IncidentForm;