import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box, CssBaseline, Drawer, AppBar, Toolbar, Typography, Divider, IconButton, useMediaQuery, Container, CircularProgress } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Sidebar from './Sidebar';
import Header from './Header';
import NotificationComponent from './NotificationComponent';
import { useAuth } from '../hooks/useAuth';

// Ширина бокового меню
const drawerWidth = 240;

// Стилизованный компонент для основного контента
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  }),
);

// Стилизованный компонент для AppBar
const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

// Стилизованный компонент для заголовка drawer
const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  // необходимо для контента, чтобы быть ниже app bar
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

/**
 * Основной компонент макета приложения
 * Включает в себя верхнюю панель, боковое меню и основной контент
 */
const Layout = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading, user } = useAuth();
  
  // Определяем, находимся ли мы на мобильном устройстве
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Состояние для открытия/закрытия бокового меню
  const [open, setOpen] = useState(!isMobile);
  
  // Состояние для заголовка текущей страницы
  const [pageTitle, setPageTitle] = useState('Dashboard');

  // Обработчики для открытия/закрытия бокового меню
  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  // Обновляем заголовок страницы при изменении маршрута
  useEffect(() => {
    const path = location.pathname;
    
    if (path === '/dashboard') setPageTitle('Dashboard');
    else if (path.includes('/incidents')) setPageTitle('Incidents Management');
    else if (path.includes('/equipment')) setPageTitle('Equipment Management');
    else if (path.includes('/reports')) setPageTitle('Reports');
    else if (path.includes('/profile')) setPageTitle('User Profile');
    else setPageTitle('IT Service Desk');
    
    // На мобильных устройствах закрываем боковое меню при переходе на новую страницу
    if (isMobile) {
      setOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Закрываем боковое меню при переходе на мобильное устройство
  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [isMobile]);

  // Если пользователь не авторизован и не находится на странице логина, перенаправляем на логин
  useEffect(() => {
    if (!loading && !isAuthenticated() && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [isAuthenticated, loading, location.pathname, navigate]);

  // Если идет загрузка аутентификации, показываем индикатор загрузки
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Если пользователь не авторизован и находится на странице логина, показываем только контент без макета
  if (!isAuthenticated() && location.pathname === '/login') {
    return <Outlet />;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* Верхняя панель */}
      <StyledAppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{ mr: 2, ...(open && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {pageTitle}
          </Typography>
          
          {/* Компонент уведомлений */}
          <NotificationComponent />
          
          {/* Компонент заголовка с профилем пользователя */}
          <Header user={user} />
        </Toolbar>
      </StyledAppBar>
      
      {/* Боковое меню */}
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant={isMobile ? "temporary" : "persistent"}
        anchor="left"
        open={open}
        onClose={handleDrawerClose}
      >
        <DrawerHeader>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            IT Service Desk
          </Typography>
          <IconButton onClick={handleDrawerClose}>
            {theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </DrawerHeader>
        <Divider />
        
        {/* Компонент бокового меню */}
        <Sidebar user={user} />
      </Drawer>
      
      {/* Основной контент */}
      <Main open={open}>
        <DrawerHeader />
        <Container maxWidth="xl">
          <Outlet />
        </Container>
      </Main>
    </Box>
  );
};

export default Layout;