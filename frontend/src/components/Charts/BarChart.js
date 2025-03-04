import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  LabelList
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
  Tooltip as MuiTooltip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useMediaQuery } from '@mui/material';
import { formatNumber, truncateText } from '../../utils/formatters';

/**
 * Компонент столбчатой диаграммы с возможностью настройки и экспорта
 * 
 * @param {Object} props - Свойства компонента
 * @param {Array} props.data - Данные для отображения на графике
 * @param {string} props.dataKey - Ключ данных для оси X
 * @param {Array} props.bars - Массив объектов с настройками для каждого столбца
 * @param {string} props.xAxisDataKey - Ключ данных для оси X
 * @param {string} props.title - Заголовок графика
 * @param {string} props.subtitle - Подзаголовок графика
 * @param {boolean} props.loading - Флаг загрузки данных
 * @param {boolean} props.error - Флаг ошибки загрузки данных
 * @param {Function} props.onRefresh - Функция обновления данных
 * @param {Function} props.onExport - Функция экспорта данных
 * @param {Object} props.options - Дополнительные настройки графика
 * @param {boolean} props.stacked - Флаг для отображения столбцов стопкой
 * @param {string} props.layout - Ориентация графика ('vertical' или 'horizontal')
 * @param {number} props.height - Высота графика
 * @param {Object} props.filters - Объект с фильтрами для данных
 * @param {Function} props.onFilterChange - Функция изменения фильтров
 * @param {string} props.emptyMessage - Сообщение при отсутствии данных
 * @param {string} props.errorMessage - Сообщение при ошибке загрузки данных
 */
const BarChart = ({
  data = [],
  dataKey,
  bars = [],
  xAxisDataKey,
  title,
  subtitle,
  loading = false,
  error = false,
  onRefresh,
  onExport,
  options = {},
  stacked = false,
  layout = 'vertical',
  height = 400,
  filters = {},
  onFilterChange,
  emptyMessage = 'Нет данных для отображения',
  errorMessage = 'Ошибка загрузки данных',
  info,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.down('md'));
  
  // Цвета из темы для столбцов
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

  // Состояние для активного столбца при наведении
  const [activeIndex, setActiveIndex] = useState(null);

  // Обработчик наведения на столбец
  const handleMouseEnter = useCallback((_, index) => {
    setActiveIndex(index);
  }, []);

  // Обработчик ухода мыши со столбца
  const handleMouseLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  // Настройка кастомного тултипа
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    
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
          {label}
        </Typography>
        {payload.map((entry, index) => (
          <Box key={`tooltip-item-${index}`} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Box 
              component="span" 
              sx={{ 
                width: 12, 
                height: 12, 
                backgroundColor: entry.color, 
                display: 'inline-block',
                mr: 1,
                borderRadius: '2px'
              }} 
            />
            <Typography variant="body2" component="span" sx={{ mr: 1 }}>
              {entry.name}:
            </Typography>
            <Typography variant="body2" component="span" sx={{ fontWeight: 'bold' }}>
              {formatNumber(entry.value)}
            </Typography>
          </Box>
        ))}
      </Paper>
    );
  };

  // Проверка наличия данных
  const hasData = data && data.length > 0;

  // Определение ориентации графика
  const isVertical = layout === 'vertical';

  // Расчет отступов в зависимости от размера экрана
  const margin = isSmallScreen 
    ? { top: 20, right: 20, left: 20, bottom: 60 }
    : { top: 20, right: 30, left: 30, bottom: 60 };

  // Настройка формата меток оси
  const formatAxisTick = (value) => {
    if (typeof value === 'string' && value.length > 15) {
      return truncateText(value, isSmallScreen ? 10 : 15);
    }
    return value;
  };

  // Компонент для отображения при загрузке
  const renderSkeleton = () => (
    <Box sx={{ width: '100%', height }}>
      <Skeleton variant="rectangular" width="100%" height={height} animation="wave" />
    </Box>
  );

  // Компонент для отображения при ошибке
  const renderError = () => (
    <Box 
      sx={{ 
        width: '100%', 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        backgroundColor: theme.palette.error.lighter || '#ffebee',
        borderRadius: 1
      }}
    >
      <Typography variant="h6" color="error" gutterBottom>
        {errorMessage}
      </Typography>
      {onRefresh && (
        <IconButton onClick={onRefresh} color="primary">
          <RefreshIcon />
        </IconButton>
      )}
    </Box>
  );

  // Компонент для отображения при отсутствии данных
  const renderEmpty = () => (
    <Box 
      sx={{ 
        width: '100%', 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        backgroundColor: theme.palette.grey[100],
        borderRadius: 1
      }}
    >
      <Typography variant="h6" color="textSecondary" gutterBottom>
        {emptyMessage}
      </Typography>
      {onRefresh && (
        <IconButton onClick={onRefresh} color="primary">
          <RefreshIcon />
        </IconButton>
      )}
    </Box>
  );

  // Основной рендер графика
  return (
    <Paper 
      elevation={options.elevation || 1} 
      sx={{ 
        p: 2, 
        height: 'auto', 
        width: '100%',
        ...options.paperSx
      }}
    >
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          {title && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" component="h3">
                {title}
              </Typography>
              {info && (
                <MuiTooltip title={info} arrow placement="top">
                  <IconButton size="small" sx={{ ml: 0.5 }}>
                    <InfoOutlinedIcon fontSize="small" />
                  </IconButton>
                </MuiTooltip>
              )}
            </Box>
          )}
          {subtitle && (
            <Typography variant="body2" color="textSecondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onRefresh && (
            <IconButton onClick={onRefresh} size="small" title="Обновить данные">
              <RefreshIcon fontSize="small" />
            </IconButton>
          )}
          {onExport && (
            <IconButton onClick={onExport} size="small" title="Экспортировать данные">
              <DownloadIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Фильтры, если они есть */}
      {onFilterChange && Object.keys(filters).length > 0 && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {Object.entries(filters).map(([key, value]) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={key}>
              <FormControl fullWidth size="small">
                <InputLabel id={`filter-${key}-label`}>{key}</InputLabel>
                <Select
                  labelId={`filter-${key}-label`}
                  id={`filter-${key}`}
                  value={value}
                  label={key}
                  onChange={(e) => onFilterChange(key, e.target.value)}
                >
                  <MenuItem value="all">Все</MenuItem>
                  {/* Здесь должны быть динамические опции для каждого фильтра */}
                  {/* Это пример, реальные опции должны приходить из props */}
                  <MenuItem value="option1">Опция 1</MenuItem>
                  <MenuItem value="option2">Опция 2</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Отображение графика или состояний загрузки/ошибки/пустых данных */}
      {loading ? (
        renderSkeleton()
      ) : error ? (
        renderError()
      ) : !hasData ? (
        renderEmpty()
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart
            data={data}
            layout={layout}
            margin={margin}
            barCategoryGap={isMediumScreen ? '10%' : '20%'}
            barGap={isMediumScreen ? 2 : 4}
            onMouseLeave={handleMouseLeave}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            
            {isVertical ? (
              <>
                <XAxis 
                  dataKey={xAxisDataKey} 
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  tickFormatter={formatAxisTick}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  stroke={theme.palette.divider}
                />
                <YAxis 
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  tickFormatter={(value) => formatNumber(value)}
                  stroke={theme.palette.divider}
                />
              </>
            ) : (
              <>
                <XAxis 
                  type="number"
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  tickFormatter={(value) => formatNumber(value)}
                  stroke={theme.palette.divider}
                />
                <YAxis 
                  dataKey={xAxisDataKey} 
                  type="category"
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  tickFormatter={formatAxisTick}
                  width={120}
                  stroke={theme.palette.divider}
                />
              </>
            )}
            
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ 
                paddingTop: 10,
                fontSize: 12
              }}
            />
            
            {bars.map((bar, index) => (
              <Bar
                key={`bar-${index}`}
                dataKey={bar.dataKey}
                name={bar.name || bar.dataKey}
                fill={bar.color || defaultColors[index % defaultColors.length]}
                stackId={stacked ? 'stack' : undefined}
                onMouseEnter={(data, index) => handleMouseEnter(data, index)}
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
                {...bar.props}
              >
                {!isSmallScreen && bar.showValues && (
                  <LabelList 
                    dataKey={bar.dataKey} 
                    position={isVertical ? "top" : "right"} 
                    formatter={(value) => formatNumber(value)}
                    style={{ 
                      fill: theme.palette.text.primary, 
                      fontSize: 10, 
                      fontWeight: 'bold' 
                    }}
                  />
                )}
                {data.map((entry, entryIndex) => (
                  <Cell
                    key={`cell-${entryIndex}`}
                    fill={
                      activeIndex === entryIndex
                        ? theme.palette.action.hover
                        : bar.color || defaultColors[index % defaultColors.length]
                    }
                    opacity={
                      activeIndex === null || activeIndex === entryIndex ? 1 : 0.6
                    }
                  />
                ))}
              </Bar>
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
};

export default BarChart;