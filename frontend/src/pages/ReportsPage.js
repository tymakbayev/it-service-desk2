import React, { useState, useContext, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { 
  PictureAsPdf as PdfIcon, 
  TableChart as ExcelIcon,
  InsertDriveFile as CsvIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { AuthContext } from '../contexts/AuthContext';
import AnalyticsAPI from '../api/analyticsAPI';

const ReportsPage = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [reportType, setReportType] = useState('incidents');
  const [reportFormat, setReportFormat] = useState('pdf');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [additionalFilters, setAdditionalFilters] = useState({});
  const [reportUrl, setReportUrl] = useState(null);
  const [recentReports, setRecentReports] = useState([]);

  // Проверка прав доступа
  const canAccessReports = user && (user.role === 'admin' || user.role === 'manager');

  // Загрузка последних отчетов
  useEffect(() => {
    if (canAccessReports) {
      fetchRecentReports();
    }
  }, [canAccessReports]);

  const fetchRecentReports = async () => {
    try {
      const response = await AnalyticsAPI.getDashboardData();
      if (response.recentReports) {
        setRecentReports(response.recentReports);
      }
    } catch (err) {
      console.error('Error fetching recent reports:', err);
    }
  };

  // Генерация отчета
  const handleGenerateReport = async () => {
    if (!reportType || !reportFormat) {
      setError('Пожалуйста, выберите тип и формат отчета');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setReportUrl(null);

    try {
      const params = {
        format: reportFormat,
        startDate: startDate ? startDate.toISOString().split('T')[0] : undefined,
        endDate: endDate ? endDate.toISOString().split('T')[0] : undefined,
        filters: { ...additionalFilters }
      };

      const result = await AnalyticsAPI.generateReport(reportType, params);
      
      if (result.url) {
        setReportUrl(result.url);
        setSuccess('Отчет успешно сгенерирован');
        fetchRecentReports(); // Обновляем список последних отчетов
      } else {
        setError('Не удалось получить ссылку на отчет');
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Ошибка при генерации отчета. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  // Дополнительные фильтры в зависимости от типа отчета
  const renderAdditionalFilters = () => {
    switch (reportType) {
      case 'incidents':
        return (
          <>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Статус инцидента</InputLabel>
                <Select
                  value={additionalFilters.status || ''}
                  label="Статус инцидента"
                  onChange={(e) => setAdditionalFilters({...additionalFilters, status: e.target.value})}
                >
                  <MenuItem value="">Все</MenuItem>
                  <MenuItem value="open">Открыт</MenuItem>
                  <MenuItem value="in_progress">В работе</MenuItem>
                  <MenuItem value="resolved">Решен</MenuItem>
                  <MenuItem value="closed">Закрыт</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Приоритет</InputLabel>
                <Select
                  value={additionalFilters.priority || ''}
                  label="Приоритет"
                  onChange={(e) => setAdditionalFilters({...additionalFilters, priority: e.target.value})}
                >
                  <MenuItem value="">Все</MenuItem>
                  <MenuItem value="low">Низкий</MenuItem>
                  <MenuItem value="medium">Средний</MenuItem>
                  <MenuItem value="high">Высокий</MenuItem>
                  <MenuItem value="critical">Критический</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </>
        );
      case 'equipment':
        return (
          <>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Тип оборудования</InputLabel>
                <Select
                  value={additionalFilters.type || ''}
                  label="Тип оборудования"
                  onChange={(e) => setAdditionalFilters({...additionalFilters, type: e.target.value})}
                >
                  <MenuItem value="">Все</MenuItem>
                  <MenuItem value="laptop">Ноутбук</MenuItem>
                  <MenuItem value="desktop">Настольный ПК</MenuItem>
                  <MenuItem value="server">Сервер</MenuItem>
                  <MenuItem value="network">Сетевое оборудование</MenuItem>
                  <MenuItem value="peripheral">Периферия</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Статус</InputLabel>
                <Select
                  value={additionalFilters.status || ''}
                  label="Статус"
                  onChange={(e) => setAdditionalFilters({...additionalFilters, status: e.target.value})}
                >
                  <MenuItem value="">Все</MenuItem>
                  <MenuItem value="active">Активно</MenuItem>
                  <MenuItem value="repair">В ремонте</MenuItem>
                  <MenuItem value="storage">На складе</MenuItem>
                  <MenuItem value="decommissioned">Списано</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </>
        );
      case 'users':
        return (
          <>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Роль</InputLabel>
                <Select
                  value={additionalFilters.role || ''}
                  label="Роль"
                  onChange={(e) => setAdditionalFilters({...additionalFilters, role: e.target.value})}
                >
                  <MenuItem value="">Все</MenuItem>
                  <MenuItem value="admin">Администратор</MenuItem>
                  <MenuItem value="support">Техподдержка</MenuItem>
                  <MenuItem value="user">Пользователь</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Отдел</InputLabel>
                <Select
                  value={additionalFilters.department || ''}
                  label="Отдел"
                  onChange={(e) => setAdditionalFilters({...additionalFilters, department: e.target.value})}
                >
                  <MenuItem value="">Все</MenuItem>
                  <MenuItem value="it">IT</MenuItem>
                  <MenuItem value="hr">HR</MenuItem>
                  <MenuItem value="finance">Финансы</MenuItem>
                  <MenuItem value="marketing">Маркетинг</MenuItem>
                  <MenuItem value="operations">Операции</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </>
        );
      default:
        return null;
    }
  };

  // Иконка для формата отчета
  const getFormatIcon = (format) => {
    switch (format) {
      case 'pdf': return <PdfIcon />;
      case 'excel': return <ExcelIcon />;
      case 'csv': return <CsvIcon />;
      default: return <DownloadIcon />;
    }
  };

  if (!canAccessReports) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" color="error">
              У вас нет доступа к этой странице
            </Typography>
            <Typography variant="body1" sx={{ mt: 2 }}>
              Для доступа к отчетам необходимы права администратора или менеджера.
            </Typography>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Отчеты
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Создание отчета
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Тип отчета</InputLabel>
                <Select
                  value={reportType}
                  label="Тип отчета"
                  onChange={(e) => {
                    setReportType(e.target.value);
                    setAdditionalFilters({});
                  }}
                >
                  <MenuItem value="incidents">Инциденты</MenuItem>
                  <MenuItem value="equipment">Оборудование</MenuItem>
                  <MenuItem value="users">Пользователи</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Формат отчета</InputLabel>
                <Select
                  value={reportFormat}
                  label="Формат отчета"
                  onChange={(e) => setReportFormat(e.target.value)}
                >
                  <MenuItem value="pdf">PDF</MenuItem>
                  <MenuItem value="excel">Excel</MenuItem>
                  <MenuItem value="csv">CSV</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Начальная дата"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Конечная дата"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                  minDate={startDate}
                />
              </LocalizationProvider>
            </Grid>

            {renderAdditionalFilters()}

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleGenerateReport}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : getFormatIcon(reportFormat)}
                >
                  {loading ? 'Генерация...' : 'Сгенерировать отчет'}
                </Button>
              </Box>
            </Grid>
          </Grid>

          {reportUrl && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                Отчет успешно сгенерирован:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {reportUrl}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  href={reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Скачать
                </Button>
              </Box>
            </Box>
          )}
        </Paper>

        {recentReports.length > 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Недавние отчеты
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2}>
              {recentReports.map((report, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        {report.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Тип: {report.type}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Формат: {report.format.toUpperCase()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Создан: {new Date(report.createdAt).toLocaleString()}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        startIcon={getFormatIcon(report.format)}
                        href={report.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Скачать
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}
      </Box>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!success} 
        autoHideDuration={6000} 
        onClose={() => setSuccess(null)}
      >
        <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ReportsPage;
