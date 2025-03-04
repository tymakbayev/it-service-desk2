import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Paper,
  Checkbox,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Typography,
  Chip,
  CircularProgress,
  Button,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  GetApp as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { visuallyHidden } from '@mui/utils';
import { useTheme } from '@mui/material/styles';
import StatusBadge from './StatusBadge';

/**
 * Функция для сравнения значений при сортировке
 */
function descendingComparator(a, b, orderBy) {
  // Обработка null и undefined значений
  if (b[orderBy] === null || b[orderBy] === undefined) return -1;
  if (a[orderBy] === null || a[orderBy] === undefined) return 1;

  // Обработка дат
  if (orderBy.toLowerCase().includes('date') || orderBy.toLowerCase().includes('time')) {
    const dateA = new Date(a[orderBy]);
    const dateB = new Date(b[orderBy]);
    
    if (dateB < dateA) return -1;
    if (dateB > dateA) return 1;
    return 0;
  }

  // Обработка строк и чисел
  if (typeof b[orderBy] === 'string') {
    return b[orderBy].localeCompare(a[orderBy]);
  } else {
    if (b[orderBy] < a[orderBy]) return -1;
    if (b[orderBy] > a[orderBy]) return 1;
    return 0;
  }
}

/**
 * Получение компаратора в зависимости от направления сортировки
 */
function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

/**
 * Сортировка массива данных
 */
function stableSort(array, comparator) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

/**
 * Компонент заголовка таблицы с возможностью сортировки
 */
function EnhancedTableHead(props) {
  const { 
    columns, 
    order, 
    orderBy, 
    onRequestSort, 
    enableSelection, 
    numSelected, 
    rowCount, 
    onSelectAllClick 
  } = props;

  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        {enableSelection && (
          <TableCell padding="checkbox">
            <Checkbox
              color="primary"
              indeterminate={numSelected > 0 && numSelected < rowCount}
              checked={rowCount > 0 && numSelected === rowCount}
              onChange={onSelectAllClick}
              inputProps={{
                'aria-label': 'select all items',
              }}
            />
          </TableCell>
        )}
        {columns.map((column) => (
          <TableCell
            key={column.id}
            align={column.numeric ? 'right' : 'left'}
            padding={column.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === column.id ? order : false}
            style={{ 
              minWidth: column.minWidth || 'auto',
              width: column.width || 'auto'
            }}
          >
            {column.sortable !== false ? (
              <TableSortLabel
                active={orderBy === column.id}
                direction={orderBy === column.id ? order : 'asc'}
                onClick={createSortHandler(column.id)}
              >
                {column.label}
                {orderBy === column.id ? (
                  <Box component="span" sx={visuallyHidden}>
                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                  </Box>
                ) : null}
              </TableSortLabel>
            ) : (
              column.label
            )}
          </TableCell>
        ))}
        {props.actions && <TableCell align="right">Actions</TableCell>}
      </TableRow>
    </TableHead>
  );
}

EnhancedTableHead.propTypes = {
  columns: PropTypes.array.isRequired,
  numSelected: PropTypes.number,
  onRequestSort: PropTypes.func.isRequired,
  onSelectAllClick: PropTypes.func,
  order: PropTypes.oneOf(['asc', 'desc']).isRequired,
  orderBy: PropTypes.string.isRequired,
  rowCount: PropTypes.number,
  enableSelection: PropTypes.bool,
  actions: PropTypes.bool
};

/**
 * Компонент панели инструментов таблицы
 */
function EnhancedTableToolbar(props) {
  const {
    title,
    numSelected,
    onDelete,
    onRefresh,
    onDownload,
    searchValue,
    onSearchChange,
    filters,
    onFilterChange,
    loading,
    customActions
  } = props;

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleFilterClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  const handleFilterSelect = (filter) => {
    onFilterChange(filter);
    handleFilterClose();
  };

  return (
    <Box sx={{ p: 2, borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {numSelected > 0 ? (
            <Typography color="inherit" variant="subtitle1" component="div">
              {numSelected} selected
            </Typography>
          ) : (
            <Typography variant="h6" id="tableTitle" component="div">
              {title}
            </Typography>
          )}
          {loading && (
            <CircularProgress size={24} sx={{ ml: 2 }} />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {numSelected > 0 ? (
            <Tooltip title="Delete">
              <IconButton onClick={onDelete}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <>
              {customActions}
              {onDownload && (
                <Tooltip title="Download">
                  <IconButton onClick={onDownload}>
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
              )}
              {onRefresh && (
                <Tooltip title="Refresh">
                  <IconButton onClick={onRefresh}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              )}
              {filters && filters.length > 0 && (
                <>
                  <Tooltip title="Filter list">
                    <IconButton onClick={handleFilterClick}>
                      <FilterListIcon />
                    </IconButton>
                  </Tooltip>
                  <Menu
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleFilterClose}
                  >
                    {filters.map((filter, index) => (
                      <MenuItem 
                        key={index} 
                        onClick={() => handleFilterSelect(filter.value)}
                        selected={filter.selected}
                      >
                        {filter.label}
                      </MenuItem>
                    ))}
                    {filters.some(f => f.selected) && (
                      <>
                        <Divider />
                        <MenuItem onClick={() => handleFilterSelect(null)}>
                          Clear filters
                        </MenuItem>
                      </>
                    )}
                  </Menu>
                </>
              )}
            </>
          )}
        </Box>
      </Box>
      {onSearchChange && (
        <TextField
          variant="outlined"
          placeholder="Search..."
          fullWidth
          size="small"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      )}
    </Box>
  );
}

EnhancedTableToolbar.propTypes = {
  title: PropTypes.string.isRequired,
  numSelected: PropTypes.number,
  onDelete: PropTypes.func,
  onRefresh: PropTypes.func,
  onDownload: PropTypes.func,
  searchValue: PropTypes.string,
  onSearchChange: PropTypes.func,
  filters: PropTypes.array,
  onFilterChange: PropTypes.func,
  loading: PropTypes.bool,
  customActions: PropTypes.node
};

/**
 * Основной компонент таблицы данных
 */
const DataTable = ({
  title,
  data,
  columns,
  loading = false,
  error = null,
  enableSelection = false,
  enablePagination = true,
  enableSearch = true,
  enableFilters = false,
  filters = [],
  onFilterChange,
  onRowClick,
  onRefresh,
  onDownload,
  onDelete,
  onEdit,
  onView,
  customRowActions,
  emptyStateMessage = "No data available",
  initialSortBy = "",
  initialSortDirection = "asc",
  customActions,
  rowsPerPageOptions = [5, 10, 25, 50],
  defaultRowsPerPage = 10
}) => {
  const theme = useTheme();
  
  // Состояния
  const [order, setOrder] = useState(initialSortDirection);
  const [orderBy, setOrderBy] = useState(initialSortBy || (columns.length > 0 ? columns[0].id : ''));
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [searchValue, setSearchValue] = useState('');
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  // Сброс выбранных строк при изменении данных
  useEffect(() => {
    setSelected([]);
  }, [data]);

  // Сброс страницы при изменении данных или поиска
  useEffect(() => {
    setPage(0);
  }, [data, searchValue]);

  // Фильтрация данных по поисковому запросу
  const filteredData = useMemo(() => {
    if (!searchValue.trim()) return data;
    
    return data.filter(row => {
      return columns.some(column => {
        const value = row[column.id];
        if (value === null || value === undefined) return false;
        
        return String(value).toLowerCase().includes(searchValue.toLowerCase());
      });
    });
  }, [data, searchValue, columns]);

  // Обработчик запроса сортировки
  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Обработчик выбора всех строк
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = filteredData.map(n => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  // Обработчик выбора строки
  const handleClick = (event, id) => {
    if (!enableSelection) return;
    
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
  };

  // Обработчик изменения страницы
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Обработчик изменения количества строк на странице
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Обработчик клика по строке
  const handleRowClick = (event, row) => {
    if (onRowClick) {
      onRowClick(row);
    }
  };

  // Обработчики меню действий
  const handleActionMenuOpen = (event, row) => {
    event.stopPropagation();
    setActionMenuAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchorEl(null);
    setSelectedRow(null);
  };

  const handleViewAction = (event) => {
    event.stopPropagation();
    if (onView && selectedRow) {
      onView(selectedRow);
    }
    handleActionMenuClose();
  };

  const handleEditAction = (event) => {
    event.stopPropagation();
    if (onEdit && selectedRow) {
      onEdit(selectedRow);
    }
    handleActionMenuClose();
  };

  const handleDeleteAction = (event) => {
    event.stopPropagation();
    if (onDelete && selectedRow) {
      onDelete([selectedRow.id]);
    }
    handleActionMenuClose();
  };

  // Проверка, выбрана ли строка
  const isSelected = (id) => selected.indexOf(id) !== -1;

  // Вычисление пустых строк для заполнения страницы
  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - filteredData.length) : 0;

  // Отображение ячейки с данными
  const renderCellContent = (row, column) => {
    const value = row[column.id];
    
    // Если есть кастомный рендерер для колонки
    if (column.render) {
      return column.render(value, row);
    }
    
    // Если значение null или undefined
    if (value === null || value === undefined) {
      return '-';
    }
    
    // Обработка различных типов данных
    if (column.type === 'date') {
      return new Date(value).toLocaleDateString();
    } else if (column.type === 'datetime') {
      return new Date(value).toLocaleString();
    } else if (column.type === 'status') {
      return <StatusBadge status={value} />;
    } else if (column.type === 'boolean') {
      return value ? 'Yes' : 'No';
    } else if (column.type === 'chip') {
      return <Chip label={value} size="small" />;
    } else if (column.type === 'currency') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    } else if (column.type === 'number') {
      return new Intl.NumberFormat().format(value);
    } else if (column.type === 'percent') {
      return `${value}%`;
    } else if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    // По умолчанию возвращаем строковое представление
    return String(value);
  };

  return (
    <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden' }}>
      <EnhancedTableToolbar
        title={title}
        numSelected={selected.length}
        onDelete={selected.length > 0 ? () => onDelete(selected) : null}
        onRefresh={onRefresh}
        onDownload={onDownload}
        searchValue={enableSearch ? searchValue : ''}
        onSearchChange={enableSearch ? setSearchValue : null}
        filters={enableFilters ? filters : null}
        onFilterChange={onFilterChange}
        loading={loading}
        customActions={customActions}
      />
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table
          sx={{ minWidth: 750 }}
          aria-labelledby="tableTitle"
          size="medium"
          stickyHeader
        >
          <EnhancedTableHead
            columns={columns}
            numSelected={selected.length}
            order={order}
            orderBy={orderBy}
            onSelectAllClick={handleSelectAllClick}
            onRequestSort={handleRequestSort}
            rowCount={filteredData.length}
            enableSelection={enableSelection}
            actions={onView || onEdit || onDelete || customRowActions}
          />
          <TableBody>
            {loading ? (
              <TableRow style={{ height: 53 * 5 }}>
                <TableCell colSpan={columns.length + (enableSelection ? 1 : 0) + ((onView || onEdit || onDelete || customRowActions) ? 1 : 0)}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow style={{ height: 53 * 5 }}>
                <TableCell colSpan={columns.length + (enableSelection ? 1 : 0) + ((onView || onEdit || onDelete || customRowActions) ? 1 : 0)}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3, color: theme.palette.error.main }}>
                    <Typography variant="body1">{error}</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow style={{ height: 53 * 5 }}>
                <TableCell colSpan={columns.length + (enableSelection ? 1 : 0) + ((onView || onEdit || onDelete || customRowActions) ? 1 : 0)}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      {emptyStateMessage}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              stableSort(filteredData, getComparator(order, orderBy))
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => {
                  const isItemSelected = isSelected(row.id);
                  const labelId = `enhanced-table-checkbox-${index}`;

                  return (
                    <TableRow
                      hover
                      onClick={(event) => handleRowClick(event, row)}
                      role="checkbox"
                      aria-checked={isItemSelected}
                      tabIndex={-1}
                      key={row.id}
                      selected={isItemSelected}
                      sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                    >
                      {enableSelection && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            color="primary"
                            checked={isItemSelected}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleClick(event, row.id);
                            }}
                            inputProps={{
                              'aria-labelledby': labelId,
                            }}
                          />
                        </TableCell>
                      )}
                      {columns.map((column, colIndex) => (
                        <TableCell
                          key={`${row.id}-${column.id}`}
                          align={column.numeric ? 'right' : 'left'}
                          padding={colIndex === 0 && enableSelection ? 'none' : 'normal'}
                        >
                          {renderCellContent(row, column)}
                        </TableCell>
                      ))}
                      {(onView || onEdit || onDelete || customRowActions) && (
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            {customRowActions && customRowActions(row)}
                            
                            {(onView || onEdit || onDelete) && (
                              <>
                                <IconButton
                                  size="small"
                                  onClick={(event) => handleActionMenuOpen(event, row)}
                                >
                                  <MoreVertIcon />
                                </IconButton>
                                <Menu
                                  anchorEl={actionMenuAnchorEl}
                                  open={Boolean(actionMenuAnchorEl) && selectedRow?.id === row.id}
                                  onClose={handleActionMenuClose}
                                >
                                  {onView && (
                                    <MenuItem onClick={handleViewAction}>
                                      <ViewIcon fontSize="small" sx={{ mr: 1 }} />
                                      View
                                    </MenuItem>
                                  )}
                                  {onEdit && (
                                    <MenuItem onClick={handleEditAction}>
                                      <EditIcon fontSize="small" sx={{ mr: 1 }} />
                                      Edit
                                    </MenuItem>
                                  )}
                                  {onDelete && (
                                    <MenuItem onClick={handleDeleteAction}>
                                      <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                                      Delete
                                    </MenuItem>
                                  )}
                                </Menu>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
            )}
            {emptyRows > 0 && !loading && !error && filteredData.length > 0 && (
              <TableRow style={{ height: 53 * emptyRows }}>
                <TableCell colSpan={columns.length + (enableSelection ? 1 : 0) + ((onView || onEdit || onDelete || customRowActions) ? 1 : 0)} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {enablePagination && filteredData.length > 0 && (
        <TablePagination
          rowsPerPageOptions={rowsPerPageOptions}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      )}
    </Paper>
  );
};

DataTable.propTypes = {
  title: PropTypes.string.isRequired,
  data: PropTypes.array.isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      numeric: PropTypes.bool,
      disablePadding: PropTypes.bool,
      sortable: PropTypes.bool,
      type: PropTypes.oneOf(['text', 'number', 'date', 'datetime', 'boolean', 'status', 'chip', 'currency', 'percent']),
      render: PropTypes.func,
      minWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      width: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
    })
  ).isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
  enableSelection: PropTypes.bool,
  enablePagination: PropTypes.bool,
  enableSearch: PropTypes.bool,
  enableFilters: PropTypes.bool,
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.any.isRequired,
      selected: PropTypes.bool
    })
  ),
  onFilterChange: PropTypes.func,
  onRowClick: PropTypes.func,
  onRefresh: PropTypes.func,
  onDownload: PropTypes.func,
  onDelete: PropTypes.func,
  onEdit: PropTypes.func,
  onView: PropTypes.func,
  customRowActions: PropTypes.func,
  emptyStateMessage: PropTypes.string,
  initialSortBy: PropTypes.string,
  initialSortDirection: PropTypes.oneOf(['asc', 'desc']),
  customActions: PropTypes.node,
  rowsPerPageOptions: PropTypes.array,
  defaultRowsPerPage: PropTypes.number
};

export default DataTable;