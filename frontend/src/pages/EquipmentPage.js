import React, { useState, useEffect, useContext } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Grid, 
  Paper, 
  TextField, 
  MenuItem, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon } from '@mui/icons-material';
import EquipmentAPI from '../api/equipmentAPI';
import { AuthContext } from '../contexts/AuthContext';
import EquipmentTable from '../components/equipment/EquipmentTable';
import EquipmentForm from '../components/equipment/EquipmentForm';

const EquipmentPage = () => {
  const { user } = useContext(AuthContext);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentEquipment, setCurrentEquipment] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: '',
    page: 1,
    limit: 10
  });
  const [totalItems, setTotalItems] = useState(0);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  // Check if user has admin or technician role
  const canManageEquipment = user && (user.role === 'admin' || user.role === 'technician');

  useEffect(() => {
    fetchEquipment();
  }, [filters.page, filters.limit]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const { search, ...apiFilters } = filters;
      
      // Add search term to API filters if present
      if (search) {
        apiFilters.search = search;
      }
      
      const response = await EquipmentAPI.getEquipment(apiFilters);
      setEquipment(response.items);
      setTotalItems(response.total);
      setError(null);
    } catch (err) {
      setError('Failed to load equipment. Please try again.');
      console.error('Error fetching equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      // Reset to page 1 when filters change
      page: name !== 'page' ? 1 : prev.page
    }));
  };

  const handleSearch = () => {
    fetchEquipment();
  };

  const handleOpenDialog = (equipment = null) => {
    setCurrentEquipment(equipment);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentEquipment(null);
  };

  const handleSaveEquipment = async (equipmentData) => {
    try {
      setLoading(true);
      
      if (currentEquipment) {
        // Update existing equipment
        await EquipmentAPI.updateEquipment(currentEquipment.id, equipmentData);
        setNotification({
          open: true,
          message: 'Equipment updated successfully',
          severity: 'success'
        });
      } else {
        // Create new equipment
        await EquipmentAPI.createEquipment(equipmentData);
        setNotification({
          open: true,
          message: 'Equipment created successfully',
          severity: 'success'
        });
      }
      
      handleCloseDialog();
      fetchEquipment();
    } catch (err) {
      setNotification({
        open: true,
        message: `Failed to ${currentEquipment ? 'update' : 'create'} equipment: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignEquipment = async (equipmentId, userId) => {
    try {
      setLoading(true);
      await EquipmentAPI.assignEquipment(equipmentId, userId);
      setNotification({
        open: true,
        message: 'Equipment assigned successfully',
        severity: 'success'
      });
      fetchEquipment();
    } catch (err) {
      setNotification({
        open: true,
        message: `Failed to assign equipment: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignEquipment = async (equipmentId) => {
    try {
      setLoading(true);
      await EquipmentAPI.unassignEquipment(equipmentId);
      setNotification({
        open: true,
        message: 'Equipment unassigned successfully',
        severity: 'success'
      });
      fetchEquipment();
    } catch (err) {
      setNotification({
        open: true,
        message: `Failed to unassign equipment: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const handlePageChange = (event, newPage) => {
    setFilters(prev => ({ ...prev, page: newPage + 1 }));
  };

  const handleLimitChange = (event) => {
    setFilters(prev => ({
      ...prev,
      limit: parseInt(event.target.value, 10),
      page: 1
    }));
  };

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Equipment Management
        </Typography>
        
        {/* Filters */}
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Search"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                select
                fullWidth
                label="Status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                variant="outlined"
                size="small"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="assigned">Assigned</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
                <MenuItem value="retired">Retired</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                select
                fullWidth
                label="Type"
                name="type"
                value={filters.type}
                onChange={handleFilterChange}
                variant="outlined"
                size="small"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="laptop">Laptop</MenuItem>
                <MenuItem value="desktop">Desktop</MenuItem>
                <MenuItem value="monitor">Monitor</MenuItem>
                <MenuItem value="printer">Printer</MenuItem>
                <MenuItem value="server">Server</MenuItem>
                <MenuItem value="network">Network Device</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<SearchIcon />}
                onClick={handleSearch}
              >
                Search
              </Button>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Action Button */}
        {canManageEquipment && (
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Equipment
            </Button>
          </Box>
        )}
        
        {/* Equipment Table */}
        {loading && equipment.length === 0 ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        ) : (
          <EquipmentTable 
            equipment={equipment}
            onEdit={canManageEquipment ? handleOpenDialog : undefined}
            onAssign={canManageEquipment ? handleAssignEquipment : undefined}
            onUnassign={canManageEquipment ? handleUnassignEquipment : undefined}
            page={filters.page - 1}
            limit={filters.limit}
            total={totalItems}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        )}
      </Box>
      
      {/* Equipment Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentEquipment ? 'Edit Equipment' : 'Add New Equipment'}
        </DialogTitle>
        <DialogContent>
          <EquipmentForm 
            equipment={currentEquipment} 
            onSubmit={handleSaveEquipment} 
            onCancel={handleCloseDialog}
          />
        </DialogContent>
      </Dialog>
      
      {/* Notification Snackbar */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default EquipmentPage;
