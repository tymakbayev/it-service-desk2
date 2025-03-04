import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
  Label,
  Area,
  ComposedChart,
  Scatter
} from 'recharts';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  Skeleton,
  Chip,
  Grid,
  IconButton,
  Tooltip as MuiTooltip,
  Switch,
  FormControlLabel,
  useMediaQuery
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import { formatNumber, truncateText, formatDate } from '../../utils/formatters';

/**
 * Компонент линейного графика с возможностью настройки и экспорта
 * 
 * @param {Object} props - Свойства компонента
 * @param {Array} props.data - Данные для отображения на графике
 * @param {Array} props.lines - Массив объектов с настройками для каждой линии
 * @param {string} props.xAxisDataKey - Ключ данных для оси X
 * @param {string} props.title - Заголовок графика
 * @param {string} props.subtitle - Подзаголовок графика
 * @param {boolean} props.loading - Флаг загрузки данных
 * @param {boolean} props.error - Флаг ошибки загрузки данных
 * @param {Function} props.onRefresh - Функция обновления данных
 * @param {Function} props.onExport - Функция экспорта данных
 * @param {Object} props.options - Дополнительные настройки графика
 * @param {number} props.height - Высота графика
 * @param {Object} props.filters - Объект с фильтрами для данных
 * @param {Function} props.onFilterChange - Функция изменения фильтров
 * @param {string} props.emptyMessage - Сообщение при отсутствии данных
 * @param {string} props.errorMessage - Сообщение при ошибке загрузки данных
 * @param {Object} props.info - Дополнительная информация о графике
 * @param {boolean} props.showBrush - Флаг для отображения компонента Brush
 * @param {boolean} props.showDots - Флаг для отображения точек на линиях
 * @param {boolean} props.showArea - Флаг для отображения области под линиями
 * @param {Array} props.referenceLines - Массив объектов для отображения референсных линий
 * @param {boolean} props.syncId - ID для синхронизации с другими графиками
 * @param {string} props.xAxisType - Тип оси X ('number', 'category', 'time')
 * @param {string} props.yAxisType - Тип оси Y ('number', 'category', 'time')
 * @param {boolean} props.allowZoom - Флаг для включения возможности масштабирования
 */
const LineChart = ({
  data = [],
  lines = [],
  xAxisDataKey,
  title,
  subtitle,
  loading = false,
  error = false,
  onRefresh,
  onExport,
  options = {},
  height = 400,
  filters = {},
  onFilterChange,
  emptyMessage = 'Нет данных для отображения',
  errorMessage = 'Ошибка загрузки данных',
  info,
  showBrush = false,
  showDots = true,
  showArea = false,
  referenceLines = [],
  syncId,
  xAxisType = 'category',
  yAxisType = 'number',
  allowZoom = false,
  dateFormat = 'dd.MM.yyyy',
  tooltipDateFormat = 'dd.MM.yyyy HH:mm',
  customTooltip,
  customLegend,
  gridLines = true,
  margin = { top: 10, right: 30, left: 0, bottom: 0 },
  yAxisDomain,
  xAxisDomain,
  yAxisLabel,
  xAxisLabel,
  yAxisWidth = 60,
  xAxisHeight = 30,
  animationDuration = 300,
  curveType = 'monotone', // linear, basis, natural, monotone
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.down('md'));

  // Цвета из темы для линий
  const defaultColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.info.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.primary.light,
    theme.palette.secondary.light,
  ];

  // Состояние для активной линии при наведении
  const [activeIndex, setActiveIndex] = useState(null);
  
  // Состояние для масштабирования
  const [zoomDomain, setZoomDomain] = useState(null);
  const [showAllData, setShowAllData] = useState(true);

  // Обработчик наведения на линию
  const handleMouseEnter = useCallback((_, index) => {
    setActiveIndex(index);
  }, []);

  // Обработчик ухода мыши с линии
  const handleMouseLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  // Обработчик масштабирования
  const handleZoom = useCallback((domain) => {
    setZoomDomain(domain);
    setShowAllData(false);
  }, []);

  // Сброс масштабирования
  const resetZoom = useCallback(() => {
    setZoomDomain(null);
    setShowAllData(true);
  }, []);

  // Настройка кастомного тултипа
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    
    // Если передан пользовательский тултип, используем его
    if (customTooltip) {
      return customTooltip({ active, payload, label });
    }
    
    return (
      <Paper 
        elevation={3} 
        sx={{ 
          padding: 1.5, 
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: `1px solid ${theme.palette.divider}`,
          maxWidth: 300
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          {xAxisType === 'time' ? formatDate(label, tooltipDateFormat) : label}
        </Typography>
        {payload.map((entry, index) => (
          <Box key={`tooltip-item-${index}`} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Box 
              component="span" 
              sx={{ 
                display: 'inline-block', 
                width: 12, 
                height: 12, 
                borderRadius: '50%', 
                backgroundColor: entry.color,
                mr: 1
              }} 
            />
            <Typography variant="body2" component="span" sx={{ mr: 1, color: theme.palette.text.secondary }}>
              {entry.name}:
            </Typography>
            <Typography variant="body2" component="span" sx={{ fontWeight: 'medium' }}>
              {typeof entry.value === 'number' ? formatNumber(entry.value) : entry.value}
            </Typography>
          </Box>
        ))}
      </Paper>
    );
  };

  // Рендер компонента при загрузке
  if (loading) {
    return (
      <Paper elevation={2} sx={{ p: 2, height: height }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Skeleton variant="text" width={200} height={32} />
            {subtitle && <Skeleton variant="text" width={300} height={24} />}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Skeleton variant="circular" width={40} height={40} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: height - 100 }}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  // Рендер компонента при ошибке
  if (error) {
    return (
      <Paper elevation={2} sx={{ p: 2, height: height }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{title}</Typography>
          {onRefresh && (
            <IconButton onClick={onRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          )}
        </Box>
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: height - 100,
            flexDirection: 'column',
            color: theme.palette.error.main
          }}
        >
          <Typography variant="body1" color="error" gutterBottom>
            {errorMessage}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Попробуйте обновить данные
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Рендер компонента при отсутствии данных
  if (!data || data.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 2, height: height }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{title}</Typography>
          {onRefresh && (
            <IconButton onClick={onRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          )}
        </Box>
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: height - 100,
            flexDirection: 'column'
          }}
        >
          <Typography variant="body1" color="textSecondary" gutterBottom>
            {emptyMessage}
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Подготовка данных для графика
  const chartData = data.map(item => {
    if (xAxisType === 'time' && typeof item[xAxisDataKey] === 'string') {
      return {
        ...item,
        [xAxisDataKey]: new Date(item[xAxisDataKey])
      };
    }
    return item;
  });

  // Рендер основного компонента
  return (
    <Paper elevation={2} sx={{ p: 2, height: height }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">{title}</Typography>
            {info && (
              <MuiTooltip title={info}>
                <InfoOutlinedIcon fontSize="small" color="action" />
              </MuiTooltip>
            )}
          </Box>
          {subtitle && (
            <Typography variant="body2" color="textSecondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {allowZoom && (
            <>
              <IconButton 
                onClick={resetZoom} 
                size="small" 
                disabled={showAllData}
                color="primary"
              >
                <ZoomOutIcon fontSize="small" />
              </IconButton>
            </>
          )}
          {onRefresh && (
            <IconButton onClick={onRefresh} size="small">
              <RefreshIcon fontSize="small" />
            </IconButton>
          )}
          {onExport && (
            <IconButton onClick={onExport} size="small">
              <DownloadIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Фильтры */}
      {Object.keys(filters).length > 0 && onFilterChange && (
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {Object.entries(filters).map(([key, value]) => (
            <FormControl key={key} size="small" sx={{ minWidth: 120 }}>
              <InputLabel id={`filter-${key}-label`}>{value.label}</InputLabel>
              <Select
                labelId={`filter-${key}-label`}
                id={`filter-${key}`}
                value={value.value}
                label={value.label}
                onChange={(e) => onFilterChange(key, e.target.value)}
              >
                {value.options.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}
        </Box>
      )}

      {/* Переключатель отображения точек и областей */}
      <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={showDots}
              onChange={(e) => onFilterChange && onFilterChange('showDots', e.target.checked)}
              size="small"
            />
          }
          label="Показать точки"
        />
        <FormControlLabel
          control={
            <Switch
              checked={showArea}
              onChange={(e) => onFilterChange && onFilterChange('showArea', e.target.checked)}
              size="small"
            />
          }
          label="Показать области"
        />
      </Box>

      {/* График */}
      <Box sx={{ width: '100%', height: height - 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          {showArea ? (
            <ComposedChart
              data={chartData}
              margin={margin}
              syncId={syncId}
              onMouseDown={(e) => allowZoom && e && e.activeLabel && handleZoom([e.activeLabel, null])}
              onMouseMove={(e) => allowZoom && !showAllData && e && e.activeLabel && handleZoom([zoomDomain[0], e.activeLabel])}
            >
              {gridLines && <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />}
              
              <XAxis 
                dataKey={xAxisDataKey} 
                type={xAxisType}
                domain={zoomDomain || xAxisDomain || ['auto', 'auto']}
                tickFormatter={(value) => xAxisType === 'time' ? formatDate(value, dateFormat) : value}
                height={xAxisHeight}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              >
                {xAxisLabel && <Label value={xAxisLabel} offset={-5} position="insideBottom" />}
              </XAxis>
              
              <YAxis 
                type={yAxisType}
                domain={yAxisDomain || ['auto', 'auto']}
                width={yAxisWidth}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              >
                {yAxisLabel && <Label value={yAxisLabel} angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />}
              </YAxis>
              
              <Tooltip content={<CustomTooltip />} />
              
              {customLegend || (
                <Legend 
                  onMouseEnter={handleMouseEnter} 
                  onMouseLeave={handleMouseLeave}
                  wrapperStyle={{ paddingTop: 10 }}
                />
              )}
              
              {referenceLines.map((line, index) => (
                <ReferenceLine
                  key={`ref-line-${index}`}
                  x={line.x}
                  y={line.y}
                  stroke={line.color || theme.palette.grey[500]}
                  strokeDasharray={line.strokeDasharray || "3 3"}
                  label={line.label && {
                    value: line.label,
                    position: line.labelPosition || 'insideTopRight',
                    fill: line.labelColor || theme.palette.text.primary,
                  }}
                />
              ))}
              
              {lines.map((line, index) => (
                <React.Fragment key={`line-group-${index}`}>
                  <Area
                    type={curveType}
                    dataKey={line.dataKey}
                    name={line.name}
                    stroke={line.color || defaultColors[index % defaultColors.length]}
                    fill={line.color || defaultColors[index % defaultColors.length]}
                    fillOpacity={0.1}
                    strokeWidth={activeIndex === index ? 3 : 2}
                    dot={showDots ? { r: 4, strokeWidth: 1 } : false}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    isAnimationActive={true}
                    animationDuration={animationDuration}
                    connectNulls={line.connectNulls}
                  />
                  {line.secondaryDataKey && (
                    <Line
                      type={curveType}
                      dataKey={line.secondaryDataKey}
                      name={line.secondaryName}
                      stroke={line.secondaryColor || theme.palette.grey[500]}
                      strokeDasharray="5 5"
                      strokeWidth={activeIndex === index ? 3 : 2}
                      dot={showDots ? { r: 4, strokeWidth: 1 } : false}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      isAnimationActive={true}
                      animationDuration={animationDuration}
                      connectNulls={line.connectNulls}
                    />
                  )}
                </React.Fragment>
              ))}
              
              {showBrush && (
                <Brush 
                  dataKey={xAxisDataKey} 
                  height={30} 
                  stroke={theme.palette.primary.main}
                  tickFormatter={(value) => xAxisType === 'time' ? formatDate(value, dateFormat) : value}
                />
              )}
            </ComposedChart>
          ) : (
            <RechartsLineChart
              data={chartData}
              margin={margin}
              syncId={syncId}
              onMouseDown={(e) => allowZoom && e && e.activeLabel && handleZoom([e.activeLabel, null])}
              onMouseMove={(e) => allowZoom && !showAllData && e && e.activeLabel && handleZoom([zoomDomain[0], e.activeLabel])}
            >
              {gridLines && <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />}
              
              <XAxis 
                dataKey={xAxisDataKey} 
                type={xAxisType}
                domain={zoomDomain || xAxisDomain || ['auto', 'auto']}
                tickFormatter={(value) => xAxisType === 'time' ? formatDate(value, dateFormat) : value}
                height={xAxisHeight}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              >
                {xAxisLabel && <Label value={xAxisLabel} offset={-5} position="insideBottom" />}
              </XAxis>
              
              <YAxis 
                type={yAxisType}
                domain={yAxisDomain || ['auto', 'auto']}
                width={yAxisWidth}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              >
                {yAxisLabel && <Label value={yAxisLabel} angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />}
              </YAxis>
              
              <Tooltip content={<CustomTooltip />} />
              
              {customLegend || (
                <Legend 
                  onMouseEnter={handleMouseEnter} 
                  onMouseLeave={handleMouseLeave}
                  wrapperStyle={{ paddingTop: 10 }}
                />
              )}
              
              {referenceLines.map((line, index) => (
                <ReferenceLine
                  key={`ref-line-${index}`}
                  x={line.x}
                  y={line.y}
                  stroke={line.color || theme.palette.grey[500]}
                  strokeDasharray={line.strokeDasharray || "3 3"}
                  label={line.label && {
                    value: line.label,
                    position: line.labelPosition || 'insideTopRight',
                    fill: line.labelColor || theme.palette.text.primary,
                  }}
                />
              ))}
              
              {lines.map((line, index) => (
                <Line
                  key={`line-${index}`}
                  type={curveType}
                  dataKey={line.dataKey}
                  name={line.name}
                  stroke={line.color || defaultColors[index % defaultColors.length]}
                  strokeWidth={activeIndex === index ? 3 : 2}
                  dot={showDots ? { r: 4, strokeWidth: 1 } : false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  isAnimationActive={true}
                  animationDuration={animationDuration}
                  connectNulls={line.connectNulls}
                />
              ))}
              
              {showBrush && (
                <Brush 
                  dataKey={xAxisDataKey} 
                  height={30} 
                  stroke={theme.palette.primary.main}
                  tickFormatter={(value) => xAxisType === 'time' ? formatDate(value, dateFormat) : value}
                />
              )}
            </RechartsLineChart>
          )}
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default LineChart;