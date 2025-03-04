import React, { useState, useEffect, useContext } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Button, 
  Grid, 
  TextField, 
  MenuItem, 
  Box,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { Add as AddIcon, FilterList as FilterIcon } from '@mui/icons-material';
import IncidentAPI from '../api/incidentAPI';
import { AuthContext } from '../contexts/AuthContext';
import IncidentList from '../components/incidents/IncidentList';
import IncidentForm from '../components/incidents/IncidentForm';
import IncidentFilters from '../components/incidents/IncidentFilters';

const IncidentsPage = () => {
  const { user } = useContext(AuthContext);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [currentIncident, setCurrentIncident] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignedTo: '',
    startDate: '',
    endDate: '',
    searchQuery: ''
  });
  
  // Загрузка инцидентов с учетом фильтров
  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '')
      );
      const data = await IncidentAPI.getIncidents(activeFilters);
      setIncidents(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setError('Не удалось загрузить инциденты. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleCreateIncident = async (incidentData) => {
    try {
      await IncidentAPI.createIncident(incidentData);
      setShowForm(false);
      fetchIncidents();
      setError(null);
    } catch (err) {
      console.error('Error creating incident:', err);
      setError('Не удалось создать инцидент. Пожалуйста, попробуйте позже.');
    }
  };

  const handleUpdateIncident = async (id, incidentData) => {
    try {
      await IncidentAPI.updateIncident(id, incidentData);
      setShowForm(false);
      setCurrentIncident(null);
      fetchIncidents();
      setError(null);
    } catch (err) {
      console.error('Error updating incident:', err);
      setError('Не удалось обновить инцидент. Пожалуйста, попробуйте позже.');
    }
  };

  const handleDeleteIncident = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить этот инцидент?')) {
      try {
        await IncidentAPI.deleteIncident(id);
        fetchIncidents();
        setError(null);
      } catch (err) {
        console.error('Error deleting incident:', err);
        setError('Не удалось удалить инцидент. Пожалуйста, попробуйте позже.');
      }
    }
  };

  const handleEditIncident = (incident) => {
    setCurrentIncident(incident);
    setShowForm(true);
  };

  const handleApplyFilters = () => {
    fetchIncidents();
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setFilters({
      status: '',
      priority: '',
      assignedTo: '',
      startDate: '',
      endDate: '',
      searchQuery: ''
    });
    fetchIncidents();
    setShowFilters(false);
  };

  const canCreateIncident = user && (user.role === 'admin' || user.role === 'support');

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Grid container justifyContent="space-between" alignItems="center" spacing={2}>
          <Grid item>
            <Typography variant="h4" component="h1" gutterBottom>
              Управление инцидентами
            </Typography>
          </Grid>
          <Grid item>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="outlined" 
                startIcon={<FilterIcon />}
                onClick={() => setShowFilters(!showFilters)}
              >
                Фильтры
              </Button>
              {canCreateIncident && (
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setCurrentIncident(null);
                    setShowForm(true);
                  }}
                >
                  Создать инцидент
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>

        {showFilters && (
          <Paper sx={{ p: 2, mt: 2 }}>
            <IncidentFilters 
              filters={filters} 
              setFilters={setFilters} 
              onApply={handleApplyFilters} 
              onReset={handleResetFilters} 
            />
          </Paper>
        )}

        {showForm && (
          <Paper sx={{ p: 2, mt: 2 }}>
            <IncidentForm 
              incident={currentIncident} 
              onSubmit={currentIncident ? 
                (data) => handleUpdateIncident(currentIncident.id, data) : 
                handleCreateIncident
              } 
              onCancel={() => {
                setShowForm(false);
                setCurrentIncident(null);
              }} 
            />
          </Paper>
        )}

        <Paper sx={{ mt: 2, p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <IncidentList 
              incidents={incidents} 
              onEdit={handleEditIncident} 
              onDelete={handleDeleteIncident} 
              userRole={user?.role} 
            />
          )}
        </Paper>
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
    </Container>
  );
};

export default IncidentsPage;
