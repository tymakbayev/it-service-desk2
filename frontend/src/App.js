import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Container } from '@mui/material';
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import Layout from './components/Layout';
import NotificationComponent from './components/NotificationComponent';

// Ленивая загрузка страниц для оптимизации производительности
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const IncidentsPage = lazy(() => import('./pages/IncidentsPage'));
const IncidentDetailPage = lazy(() => import('./pages/IncidentDetailPage'));
const EquipmentPage = lazy(() => import('./pages/EquipmentPage'));
const EquipmentDetailPage = lazy(() => import('./pages/EquipmentDetailPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// Компонент для отображения во время загрузки
const LoadingFallback = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="100vh"
  >
    <CircularProgress size={60} thickness={4} />
  </Box>
);

// Компонент для защищенных маршрутов
const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Перенаправление на страницу входа с сохранением исходного URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Проверка прав доступа, если указаны требуемые роли
  if (requiredRoles.length > 0 && (!user.role || !requiredRoles.includes(user.role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const { isAuthenticated, user, checkAuthStatus } = useAuth();
  const { initializeNotifications } = useNotifications();
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // Проверка статуса аутентификации при загрузке приложения
  useEffect(() => {
    const initApp = async () => {
      try {
        await checkAuthStatus();
      } catch (error) {
        console.error('Authentication check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, [checkAuthStatus]);

  // Инициализация уведомлений после аутентификации
  useEffect(() => {
    if (isAuthenticated && user) {
      initializeNotifications(user.id);
    }
  }, [isAuthenticated, user, initializeNotifications]);

  // Перенаправление на дашборд после входа
  useEffect(() => {
    if (isAuthenticated && location.pathname === '/login') {
      navigate('/dashboard');
    }
  }, [isAuthenticated, location.pathname, navigate]);

  // Показываем загрузку, пока проверяем аутентификацию
  if (isLoading) {
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          {/* Вложенные маршруты внутри Layout */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          <Route path="dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          
          <Route path="incidents" element={
            <ProtectedRoute>
              <IncidentsPage />
            </ProtectedRoute>
          } />
          
          <Route path="incidents/:id" element={
            <ProtectedRoute>
              <IncidentDetailPage />
            </ProtectedRoute>
          } />
          
          <Route path="equipment" element={
            <ProtectedRoute>
              <EquipmentPage />
            </ProtectedRoute>
          } />
          
          <Route path="equipment/:id" element={
            <ProtectedRoute>
              <EquipmentDetailPage />
            </ProtectedRoute>
          } />
          
          <Route path="reports" element={
            <ProtectedRoute requiredRoles={['admin', 'manager']}>
              <ReportsPage />
            </ProtectedRoute>
          } />
          
          <Route path="profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          
          {/* Обработка несуществующих маршрутов */}
          <Route path="*" element={
            <Container sx={{ py: 4 }}>
              <Box textAlign="center" py={8}>
                <h1>404 - Страница не найдена</h1>
                <p>Запрашиваемая страница не существует.</p>
              </Box>
            </Container>
          } />
        </Route>
      </Routes>
      
      {/* Глобальный компонент уведомлений */}
      {isAuthenticated && <NotificationComponent />}
    </Suspense>
  );
}

export default App;