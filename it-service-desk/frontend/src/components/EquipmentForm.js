import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Grid,
  Typography,
  Paper,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  Autocomplete,
  Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import equipmentAPI from '../api/equipmentAPI';

/**
 * Компонент формы для создания и редактирования оборудования
 * @param {Object} props - Свойства компонента
 * @param {Object} props.equipment - Данные оборудования для редактирования (null для создания нового)
 * @param {Function} props.onSubmitSuccess - Функция обратного вызова после успешной отправки формы
 * @param {Function} props.onCancel - Функция обратного вызова при отмене
 */
const EquipmentForm = ({ equipment = null, onSubmitSuccess, onCancel }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  const isEditMode = !!equipment;

  // Схема валидации формы
  const validationSchema = Yup.object({
    name: Yup.string()
      .required('Название оборудования обязательно')
      .max(100, 'Название не должно превышать 100 символов'),
    serial_number: Yup.string()
      .required('Серийный номер обязателен')
      .max(50, 'Серийный номер не должен превышать 50 символов'),
    inventory_number: Yup.string()
      .required('Инвентарный номер обязателен')
      .max(50, 'Инвентарный номер не должен превышать 50 символов'),
    category_id: Yup.number()
      .required('Категория обязательна'),
    status_id: Yup.number()
      .required('Статус обязателен'),
    location_id: Yup.number()
      .required('Местоположение обязательно'),
    purchase_date: Yup.date()
      .nullable()
      .typeError('Введите корректную дату'),
    warranty_end_date: Yup.date()
      .nullable()
      .typeError('Введите корректную дату')
      .min(Yup.ref('purchase_date'), 'Дата окончания гарантии должна быть позже даты покупки'),
    assigned_user_id: Yup.number()
      .nullable(),
    vendor_id: Yup.number()
      .nullable(),
    model: Yup.string()
      .max(100, 'Модель не должна превышать 100 символов'),
    description: Yup.string()
      .max(500, 'Описание не должно превышать 500 символов'),
    notes: Yup.string()
      .max(1000, 'Примечания не должны превышать 1000 символов'),
    ip_address: Yup.string()
      .nullable()
      .matches(/^$|^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'Введите корректный IP адрес'),
    mac_address: Yup.string()
      .nullable()
      .matches(/^$|^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 'Введите корректный MAC адрес'),
    price: Yup.number()
      .nullable()
      .min(0, 'Цена не может быть отрицательной')
      .typeError('Введите корректное число')
  });

  // Инициализация формы с начальными значениями
  const formik = useFormik({
    initialValues: {
      name: equipment?.name || '',
      serial_number: equipment?.serial_number || '',
      inventory_number: equipment?.inventory_number || '',
      category_id: equipment?.category_id || '',
      status_id: equipment?.status_id || '',
      location_id: equipment?.location_id || '',
      purchase_date: equipment?.purchase_date ? new Date(equipment.purchase_date) : null,
      warranty_end_date: equipment?.warranty_end_date ? new Date(equipment.warranty_end_date) : null,
      assigned_user_id: equipment?.assigned_user_id || null,
      vendor_id: equipment?.vendor_id || null,
      model: equipment?.model || '',
      description: equipment?.description || '',
      notes: equipment?.notes || '',
      ip_address: equipment?.ip_address || '',
      mac_address: equipment?.mac_address || '',
      price: equipment?.price || ''
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const formattedValues = {
          ...values,
          purchase_date: values.purchase_date ? format(values.purchase_date, 'yyyy-MM-dd') : null,
          warranty_end_date: values.warranty_end_date ? format(values.warranty_end_date, 'yyyy-MM-dd') : null,
          tags: selectedTags.map(tag => tag.id)
        };

        let response;
        if (isEditMode) {
          response = await equipmentAPI.updateEquipment(equipment.id, formattedValues);
        } else {
          response = await equipmentAPI.createEquipment(formattedValues);
        }

        setSnackbar({
          open: true,
          message: isEditMode ? 'Оборудование успешно обновлено' : 'Оборудование успешно создано',
          severity: 'success'
        });

        if (onSubmitSuccess) {
          onSubmitSuccess(response.data);
        }
      } catch (error) {
        console.error('Error submitting equipment form:', error);
        setSnackbar({
          open: true,
          message: `Ошибка: ${error.response?.data?.message || 'Не удалось сохранить оборудование'}`,
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    }
  });

  // Загрузка справочных данных при монтировании компонента
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [
          categoriesResponse,
          statusesResponse,
          locationsResponse,
          usersResponse,
          vendorsResponse,
          tagsResponse
        ] = await Promise.all([
          equipmentAPI.getCategories(),
          equipmentAPI.getStatuses(),
          equipmentAPI.getLocations(),
          equipmentAPI.getUsers(),
          equipmentAPI.getVendors(),
          equipmentAPI.getTags()
        ]);

        setCategories(categoriesResponse.data || []);
        setStatuses(statusesResponse.data || []);
        setLocations(locationsResponse.data || []);
        setUsers(usersResponse.data || []);
        setVendors(vendorsResponse.data || []);
        setTags(tagsResponse.data || []);

        // Если редактируем оборудование, загружаем его теги
        if (isEditMode && equipment.id) {
          const equipmentTagsResponse = await equipmentAPI.getEquipmentTags(equipment.id);
          setSelectedTags(equipmentTagsResponse.data || []);
        }
      } catch (error) {
        console.error('Error fetching reference data:', error);
        setSnackbar({
          open: true,
          message: 'Не удалось загрузить справочные данные',
          severity: 'error'
        });
      }
    };

    fetchReferenceData();
  }, [isEditMode, equipment?.id]);

  // Обработчик закрытия snackbar
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        {isEditMode ? 'Редактирование оборудования' : 'Добавление нового оборудования'}
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={3}>
          {/* Основная информация */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Основная информация
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              id="name"
              name="name"
              label="Название оборудования"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              id="model"
              name="model"
              label="Модель"
              value={formik.values.model}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.model && Boolean(formik.errors.model)}
              helperText={formik.touched.model && formik.errors.model}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              id="serial_number"
              name="serial_number"
              label="Серийный номер"
              value={formik.values.serial_number}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.serial_number && Boolean(formik.errors.serial_number)}
              helperText={formik.touched.serial_number && formik.errors.serial_number}
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              id="inventory_number"
              name="inventory_number"
              label="Инвентарный номер"
              value={formik.values.inventory_number}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.inventory_number && Boolean(formik.errors.inventory_number)}
              helperText={formik.touched.inventory_number && formik.errors.inventory_number}
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={formik.touched.category_id && Boolean(formik.errors.category_id)}>
              <InputLabel id="category-label">Категория</InputLabel>
              <Select
                labelId="category-label"
                id="category_id"
                name="category_id"
                value={formik.values.category_id}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                label="Категория"
                required
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
              {formik.touched.category_id && formik.errors.category_id && (
                <FormHelperText>{formik.errors.category_id}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={formik.touched.status_id && Boolean(formik.errors.status_id)}>
              <InputLabel id="status-label">Статус</InputLabel>
              <Select
                labelId="status-label"
                id="status_id"
                name="status_id"
                value={formik.values.status_id}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                label="Статус"
                required
              >
                {statuses.map((status) => (
                  <MenuItem key={status.id} value={status.id}>
                    {status.name}
                  </MenuItem>
                ))}
              </Select>
              {formik.touched.status_id && formik.errors.status_id && (
                <FormHelperText>{formik.errors.status_id}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          {/* Местоположение и назначение */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Местоположение и назначение
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={formik.touched.location_id && Boolean(formik.errors.location_id)}>
              <InputLabel id="location-label">Местоположение</InputLabel>
              <Select
                labelId="location-label"
                id="location_id"
                name="location_id"
                value={formik.values.location_id}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                label="Местоположение"
                required
              >
                {locations.map((location) => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name}
                  </MenuItem>
                ))}
              </Select>
              {formik.touched.location_id && formik.errors.location_id && (
                <FormHelperText>{formik.errors.location_id}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={formik.touched.assigned_user_id && Boolean(formik.errors.assigned_user_id)}>
              <InputLabel id="assigned-user-label">Назначенный пользователь</InputLabel>
              <Select
                labelId="assigned-user-label"
                id="assigned_user_id"
                name="assigned_user_id"
                value={formik.values.assigned_user_id || ''}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                label="Назначенный пользователь"
              >
                <MenuItem value="">
                  <em>Не назначен</em>
                </MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </MenuItem>
                ))}
              </Select>
              {formik.touched.assigned_user_id && formik.errors.assigned_user_id && (
                <FormHelperText>{formik.errors.assigned_user_id}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          {/* Информация о покупке */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Информация о покупке
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={formik.touched.vendor_id && Boolean(formik.errors.vendor_id)}>
              <InputLabel id="vendor-label">Поставщик</InputLabel>
              <Select
                labelId="vendor-label"
                id="vendor_id"
                name="vendor_id"
                value={formik.values.vendor_id || ''}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                label="Поставщик"
              >
                <MenuItem value="">
                  <em>Не указан</em>
                </MenuItem>
                {vendors.map((vendor) => (
                  <MenuItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </MenuItem>
                ))}
              </Select>
              {formik.touched.vendor_id && formik.errors.vendor_id && (
                <FormHelperText>{formik.errors.vendor_id}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              id="price"
              name="price"
              label="Цена"
              type="number"
              value={formik.values.price}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.price && Boolean(formik.errors.price)}
              helperText={formik.touched.price && formik.errors.price}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>₽</Typography>,
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Дата покупки"
                value={formik.values.purchase_date}
                onChange={(value) => formik.setFieldValue('purchase_date', value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    id="purchase_date"
                    name="purchase_date"
                    error={formik.touched.purchase_date && Boolean(formik.errors.purchase_date)}
                    helperText={formik.touched.purchase_date && formik.errors.purchase_date}
                    onBlur={formik.handleBlur}
                  />
                )}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Дата окончания гарантии"
                value={formik.values.warranty_end_date}
                onChange={(value) => formik.setFieldValue('warranty_end_date', value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    id="warranty_end_date"
                    name="warranty_end_date"
                    error={formik.touched.warranty_end_date && Boolean(formik.errors.warranty_end_date)}
                    helperText={formik.touched.warranty_end_date && formik.errors.warranty_end_date}
                    onBlur={formik.handleBlur}
                  />
                )}
              />
            </LocalizationProvider>
          </Grid>

          {/* Технические характеристики */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Технические характеристики
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              id="ip_address"
              name="ip_address"
              label="IP адрес"
              value={formik.values.ip_address}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.ip_address && Boolean(formik.errors.ip_address)}
              helperText={formik.touched.ip_address && formik.errors.ip_address}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              id="mac_address"
              name="mac_address"
              label="MAC адрес"
              value={formik.values.mac_address}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.mac_address && Boolean(formik.errors.mac_address)}
              helperText={formik.touched.mac_address && formik.errors.mac_address}
            />
          </Grid>

          <Grid item xs={12}>
            <Autocomplete
              multiple
              id="tags"
              options={tags}
              value={selectedTags}
              getOptionLabel={(option) => option.name}
              onChange={(event, newValue) => {
                setSelectedTags(newValue);
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option.name}
                    {...getTagProps({ index })}
                    key={option.id}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Теги"
                  placeholder="Добавить тег"
                />
              )}
            />
          </Grid>

          {/* Описание и примечания */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Описание и примечания
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              id="description"
              name="description"
              label="Описание"
              multiline
              rows={3}
              value={formik.values.description}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.description && Boolean(formik.errors.description)}
              helperText={formik.touched.description && formik.errors.description}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              id="notes"
              name="notes"
              label="Примечания"
              multiline
              rows={3}
              value={formik.values.notes}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.notes && Boolean(formik.errors.notes)}
              helperText={formik.touched.notes && formik.errors.notes}
            />
          </Grid>

          {/* Кнопки действий */}
          <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={onCancel}
              sx={{ mr: 2 }}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} color="inherit" />}
            >
              {isEditMode ? 'Сохранить изменения' : 'Создать оборудование'}
            </Button>
          </Grid>
        </Grid>
      </form>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default EquipmentForm;