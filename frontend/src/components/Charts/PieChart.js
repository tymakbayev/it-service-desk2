import React, { useState, useEffect, useCallback } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector,
  Label
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
  useMediaQuery
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { formatNumber, truncateText } from '../../utils/formatters';

/**
 * Компонент круговой диаграммы с возможностью настройки и экспорта
 * 
 * @param {Object} props - Свойства компонента
 * @param {Array} props.data - Данные для отображения на графике
 * @param {string} props.dataKey - Ключ данных для значений
 * @param {string} props.nameKey - Ключ данных для названий сегментов
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
 * @param {Array} props.colors - Массив цветов для сегментов
 * @param {boolean} props.donut - Флаг для отображения в виде кольца
 * @param {number} props.innerRadius - Внутренний радиус для кольцевой диаграммы
 * @param {number} props.outerRadius - Внешний радиус диаграммы
 * @param {string} props.centerLabel - Текст в центре кольцевой диаграммы
 * @param {Object} props.centerLabelProps - Свойства для текста в центре
 */
const PieChart = ({
  data = [],
  dataKey = 'value',
  nameKey = 'name',
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
  colors,
  donut = false,
  innerRadius = 60,
  outerRadius = 80,
  centerLabel,
  centerLabelProps = {}
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.down('md'));

  // Цвета из темы для сегментов
  const defaultColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.info.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.primary.light,
    theme.palette.secondary.light,
    theme.palette.success.light,
    theme.palette.info.light,
    theme.palette.warning.light,
    theme.palette.error.light
  ];

  // Используем переданные цвета или цвета по умолчанию
  const chartColors = colors || defaultColors;

  // Состояние для активного сегмента при наведении
  const [activeIndex, setActiveIndex] = useState(null);

  // Обработчик наведения на сегмент
  const handleMouseEnter = useCallback((_, index) => {
    setActiveIndex(index);
  }, []);

  // Обработчик ухода мыши с сегмента
  const handleMouseLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  // Компонент для отображения активного сегмента
  const renderActiveShape = (props) => {
    const {
      cx,
      cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
      payload,
      percent,
      value
    } = props;

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 12}
          outerRadius={outerRadius + 15}
          fill={fill}
        />
        {donut && centerLabel && (
          <text
            x={cx}
            y={cy}
            dy={8}
            textAnchor="middle"
            fill={theme.palette.text.primary}
            {...centerLabelProps}
          >
            {centerLabel}
          </text>
        )}
      </g>
    );
  };

  // Настройка кастомного тултипа
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0];
    
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
          {data.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Box 
            component="span" 
            sx={{ 
              display: 'inline-block', 
              width: 12, 
              height: 12, 
              backgroundColor: data.fill,
              marginRight: 1,
              borderRadius: '50%'
            }} 
          />
          <Typography variant="body2">
            {`${formatNumber(data.value)} (${(data.percent * 100).toFixed(1)}%)`}
          </Typography>
        </Box>
      </Paper>
    );
  };

  // Проверка наличия данных
  const hasData = data && data.length > 0;

  // Вычисление общей суммы для процентов
  const total = data.reduce((sum, item) => sum + (item[dataKey] || 0), 0);

  // Преобразование данных для отображения процентов
  const chartData = data.map(item => ({
    ...item,
    percent: item[dataKey] / total
  }));

  // Настройка легенды
  const renderLegend = (props) => {
    const { payload } = props;
    
    return (
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center',
        gap: 1,
        mt: 2
      }}>
        {payload.map((entry, index) => (
          <Chip
            key={`legend-${index}`}
            label={`${entry.value}: ${formatNumber(entry.payload[dataKey])} (${(entry.payload.percent * 100).toFixed(1)}%)`}
            sx={{
              backgroundColor: entry.color,
              color: theme.palette.getContrastText(entry.color),
              '&:hover': {
                backgroundColor: entry.color,
                opacity: 0.9
              }
            }}
            onClick={() => setActiveIndex(index === activeIndex ? null : index)}
          />
        ))}
      </Box>
    );
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 2, 
        height: height,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Заголовок и управляющие элементы */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          {title && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" component="h2">
                {title}
              </Typography>
              {info && (
                <MuiTooltip title={info}>
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
            <IconButton size="small" onClick={onRefresh} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          )}
          {onExport && (
            <IconButton size="small" onClick={onExport} disabled={loading || !hasData}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Фильтры */}
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
                  <MenuItem value="">Все</MenuItem>
                  {/* Здесь должны быть варианты для фильтра */}
                  {options.filterOptions && options.filterOptions[key] && 
                    options.filterOptions[key].map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))
                  }
                </Select>
              </FormControl>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Содержимое графика */}
      <Box sx={{ flexGrow: 1, width: '100%' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography color="error">{errorMessage}</Typography>
          </Box>
        ) : !hasData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography color="textSecondary">{emptyMessage}</Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={donut ? innerRadius : 0}
                outerRadius={outerRadius}
                dataKey={dataKey}
                nameKey={nameKey}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={chartColors[index % chartColors.length]} 
                  />
                ))}
                {centerLabel && donut && (
                  <Label
                    content={({ viewBox }) => {
                      const { cx, cy } = viewBox;
                      return (
                        <text
                          x={cx}
                          y={cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{
                            fontSize: '16px',
                            fontWeight: 'bold',
                            fill: theme.palette.text.primary,
                            ...centerLabelProps.style
                          }}
                        >
                          {centerLabel}
                        </text>
                      );
                    }}
                    position="center"
                  />
                )}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                content={renderLegend}
                verticalAlign="bottom"
                align="center"
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Paper>
  );
};

export default PieChart;