import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
  Typography,
  Avatar,
  Tooltip,
  Badge,
  Chip,
  useTheme
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  BugReport as IncidentIcon,
  Computer as EquipmentIcon,
  Assessment as ReportIcon,
  Person as ProfileIcon,
  ExpandLess,
  ExpandMore,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  ExitToApp as LogoutIcon,
  SupervisorAccount as AdminIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../utils/constants';

// Styled components
const SidebarHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  backgroundColor: theme.palette.primary.dark,
  color: theme.palette.primary.contrastText,
}));

const UserInfo = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(2, 0),
}));

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#44b700',
    color: '#44b700',
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      animation: 'ripple 1.2s infinite ease-in-out',
      border: '1px solid currentColor',
      content: '""',
    },
  },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(.8)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(2.4)',
      opacity: 0,
    },
  },
}));

const RoleChip = styled(Chip)(({ theme }) => ({
  marginTop: theme.spacing(1),
  fontSize: '0.75rem',
  height: 24,
}));

const NestedList = styled(List)(({ theme }) => ({
  paddingLeft: theme.spacing(2),
}));

const ActiveListItem = styled(ListItem)(({ theme, active }) => ({
  backgroundColor: active ? theme.palette.action.selected : 'transparent',
  borderLeft: active ? `4px solid ${theme.palette.primary.main}` : 'none',
  paddingLeft: active ? theme.spacing(2) - 4 : theme.spacing(2), // Compensate for the border
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

/**
 * Sidebar component for the application
 * Displays navigation links and user information
 */
const Sidebar = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  
  // State for collapsible menu sections
  const [openIncidents, setOpenIncidents] = useState(false);
  const [openEquipment, setOpenEquipment] = useState(false);
  const [openReports, setOpenReports] = useState(false);
  const [openAdmin, setOpenAdmin] = useState(false);

  // Check if a path is active
  const isActive = (path) => {
    if (path === '/dashboard' && location.pathname === '/') {
      return true;
    }
    return location.pathname.startsWith(path);
  };

  // Handle navigation
  const handleNavigation = (path) => {
    navigate(path);
  };

  // Toggle collapsible sections
  const handleToggleIncidents = () => {
    setOpenIncidents(!openIncidents);
  };

  const handleToggleEquipment = () => {
    setOpenEquipment(!openEquipment);
  };

  const handleToggleReports = () => {
    setOpenReports(!openReports);
  };

  const handleToggleAdmin = () => {
    setOpenAdmin(!openAdmin);
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Open the relevant section based on current path
  useEffect(() => {
    if (location.pathname.includes('/incidents')) {
      setOpenIncidents(true);
    } else if (location.pathname.includes('/equipment')) {
      setOpenEquipment(true);
    } else if (location.pathname.includes('/reports')) {
      setOpenReports(true);
    } else if (location.pathname.includes('/admin')) {
      setOpenAdmin(true);
    }
  }, [location.pathname]);

  // Get role display name
  const getRoleDisplay = (roleId) => {
    switch (roleId) {
      case ROLES.ADMIN:
        return 'Administrator';
      case ROLES.TECHNICIAN:
        return 'Technician';
      case ROLES.USER:
        return 'User';
      default:
        return 'Guest';
    }
  };

  // Get role color
  const getRoleColor = (roleId) => {
    switch (roleId) {
      case ROLES.ADMIN:
        return 'error';
      case ROLES.TECHNICIAN:
        return 'primary';
      case ROLES.USER:
        return 'success';
      default:
        return 'default';
    }
  };

  // If not authenticated, don't render the sidebar
  if (!isAuthenticated()) {
    return null;
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Sidebar Header with User Info */}
      <SidebarHeader>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
          IT Service Desk
        </Typography>
        <UserInfo>
          <StyledBadge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            variant="dot"
          >
            <Avatar
              alt={user?.name || 'User'}
              src={user?.avatar || ''}
              sx={{ width: 64, height: 64, mb: 1 }}
            />
          </StyledBadge>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            {user?.name || 'User'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {user?.email || 'user@example.com'}
          </Typography>
          <RoleChip
            label={getRoleDisplay(user?.role)}
            color={getRoleColor(user?.role)}
            size="small"
          />
        </UserInfo>
      </SidebarHeader>

      <Divider />

      {/* Navigation Links */}
      <List component="nav" sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {/* Dashboard */}
        <ActiveListItem
          button
          active={isActive('/dashboard')}
          onClick={() => handleNavigation('/dashboard')}
        >
          <ListItemIcon>
            <DashboardIcon color={isActive('/dashboard') ? 'primary' : 'inherit'} />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ActiveListItem>

        {/* Incidents Section */}
        <ActiveListItem
          button
          onClick={handleToggleIncidents}
          active={isActive('/incidents')}
        >
          <ListItemIcon>
            <IncidentIcon color={isActive('/incidents') ? 'primary' : 'inherit'} />
          </ListItemIcon>
          <ListItemText primary="Incidents" />
          {openIncidents ? <ExpandLess /> : <ExpandMore />}
        </ActiveListItem>
        <Collapse in={openIncidents} timeout="auto" unmountOnExit>
          <NestedList component="div" disablePadding>
            <ActiveListItem
              button
              active={isActive('/incidents') && location.pathname === '/incidents'}
              onClick={() => handleNavigation('/incidents')}
            >
              <ListItemText primary="All Incidents" />
            </ActiveListItem>
            <ActiveListItem
              button
              active={isActive('/incidents/create')}
              onClick={() => handleNavigation('/incidents/create')}
            >
              <ListItemText primary="Create Incident" />
            </ActiveListItem>
            {(user?.role === ROLES.ADMIN || user?.role === ROLES.TECHNICIAN) && (
              <ActiveListItem
                button
                active={isActive('/incidents/assigned')}
                onClick={() => handleNavigation('/incidents/assigned')}
              >
                <ListItemText primary="Assigned to Me" />
              </ActiveListItem>
            )}
            <ActiveListItem
              button
              active={isActive('/incidents/my')}
              onClick={() => handleNavigation('/incidents/my')}
            >
              <ListItemText primary="My Incidents" />
            </ActiveListItem>
          </NestedList>
        </Collapse>

        {/* Equipment Section */}
        <ActiveListItem
          button
          onClick={handleToggleEquipment}
          active={isActive('/equipment')}
        >
          <ListItemIcon>
            <EquipmentIcon color={isActive('/equipment') ? 'primary' : 'inherit'} />
          </ListItemIcon>
          <ListItemText primary="Equipment" />
          {openEquipment ? <ExpandLess /> : <ExpandMore />}
        </ActiveListItem>
        <Collapse in={openEquipment} timeout="auto" unmountOnExit>
          <NestedList component="div" disablePadding>
            <ActiveListItem
              button
              active={isActive('/equipment') && location.pathname === '/equipment'}
              onClick={() => handleNavigation('/equipment')}
            >
              <ListItemText primary="All Equipment" />
            </ActiveListItem>
            {(user?.role === ROLES.ADMIN || user?.role === ROLES.TECHNICIAN) && (
              <ActiveListItem
                button
                active={isActive('/equipment/create')}
                onClick={() => handleNavigation('/equipment/create')}
              >
                <ListItemText primary="Add Equipment" />
              </ActiveListItem>
            )}
            <ActiveListItem
              button
              active={isActive('/equipment/my')}
              onClick={() => handleNavigation('/equipment/my')}
            >
              <ListItemText primary="My Equipment" />
            </ActiveListItem>
          </NestedList>
        </Collapse>

        {/* Reports Section - Only for Admin and Technicians */}
        {(user?.role === ROLES.ADMIN || user?.role === ROLES.TECHNICIAN) && (
          <>
            <ActiveListItem
              button
              onClick={handleToggleReports}
              active={isActive('/reports')}
            >
              <ListItemIcon>
                <ReportIcon color={isActive('/reports') ? 'primary' : 'inherit'} />
              </ListItemIcon>
              <ListItemText primary="Reports" />
              {openReports ? <ExpandLess /> : <ExpandMore />}
            </ActiveListItem>
            <Collapse in={openReports} timeout="auto" unmountOnExit>
              <NestedList component="div" disablePadding>
                <ActiveListItem
                  button
                  active={isActive('/reports/incidents')}
                  onClick={() => handleNavigation('/reports/incidents')}
                >
                  <ListItemText primary="Incident Reports" />
                </ActiveListItem>
                <ActiveListItem
                  button
                  active={isActive('/reports/equipment')}
                  onClick={() => handleNavigation('/reports/equipment')}
                >
                  <ListItemText primary="Equipment Reports" />
                </ActiveListItem>
                <ActiveListItem
                  button
                  active={isActive('/reports/performance')}
                  onClick={() => handleNavigation('/reports/performance')}
                >
                  <ListItemText primary="Performance" />
                </ActiveListItem>
              </NestedList>
            </Collapse>
          </>
        )}

        {/* Admin Section - Only for Admins */}
        {user?.role === ROLES.ADMIN && (
          <>
            <ActiveListItem
              button
              onClick={handleToggleAdmin}
              active={isActive('/admin')}
            >
              <ListItemIcon>
                <AdminIcon color={isActive('/admin') ? 'primary' : 'inherit'} />
              </ListItemIcon>
              <ListItemText primary="Administration" />
              {openAdmin ? <ExpandLess /> : <ExpandMore />}
            </ActiveListItem>
            <Collapse in={openAdmin} timeout="auto" unmountOnExit>
              <NestedList component="div" disablePadding>
                <ActiveListItem
                  button
                  active={isActive('/admin/users')}
                  onClick={() => handleNavigation('/admin/users')}
                >
                  <ListItemText primary="User Management" />
                </ActiveListItem>
                <ActiveListItem
                  button
                  active={isActive('/admin/settings')}
                  onClick={() => handleNavigation('/admin/settings')}
                >
                  <ListItemText primary="System Settings" />
                </ActiveListItem>
                <ActiveListItem
                  button
                  active={isActive('/admin/logs')}
                  onClick={() => handleNavigation('/admin/logs')}
                >
                  <ListItemText primary="System Logs" />
                </ActiveListItem>
              </NestedList>
            </Collapse>
          </>
        )}

        {/* Profile */}
        <ActiveListItem
          button
          active={isActive('/profile')}
          onClick={() => handleNavigation('/profile')}
        >
          <ListItemIcon>
            <ProfileIcon color={isActive('/profile') ? 'primary' : 'inherit'} />
          </ListItemIcon>
          <ListItemText primary="My Profile" />
        </ActiveListItem>

        {/* Help & Support */}
        <ActiveListItem
          button
          active={isActive('/help')}
          onClick={() => handleNavigation('/help')}
        >
          <ListItemIcon>
            <HelpIcon color={isActive('/help') ? 'primary' : 'inherit'} />
          </ListItemIcon>
          <ListItemText primary="Help & Support" />
        </ActiveListItem>
      </List>

      <Divider />

      {/* Bottom Actions */}
      <List>
        <ListItem button onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </Box>
  );
};

export default Sidebar;