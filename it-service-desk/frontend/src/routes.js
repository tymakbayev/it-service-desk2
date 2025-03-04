import React, { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// Ленивая загрузка компонентов для оптимизации производительности
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const IncidentsPage = lazy(() => import('./pages/IncidentsPage'));
const IncidentDetailPage = lazy(() => import('./pages/IncidentDetailPage'));
const EquipmentPage = lazy(() => import('./pages/EquipmentPage'));
const EquipmentDetailPage = lazy(() => import('./pages/EquipmentDetailPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// Определение ролей пользователей
export const ROLES = {
  ADMIN: 'admin',
  TECHNICIAN: 'technician',
  USER: 'user'
};

// Структура маршрутов приложения
const routes = [
  // Публичные маршруты (доступны без аутентификации)
  {
    path: '/login',
    element: <LoginPage />,
    public: true,
    exact: true,
  },
  
  // Защищенные маршруты (требуют аутентификации)
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
    exact: true,
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
    title: 'Дашборд',
    icon: 'dashboard',
    showInSidebar: true,
    roles: [ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.USER],
  },
  {
    path: '/incidents',
    element: <IncidentsPage />,
    title: 'Инциденты',
    icon: 'report_problem',
    showInSidebar: true,
    roles: [ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.USER],
  },
  {
    path: '/incidents/:id',
    element: <IncidentDetailPage />,
    title: 'Детали инцидента',
    showInSidebar: false,
    roles: [ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.USER],
  },
  {
    path: '/equipment',
    element: <EquipmentPage />,
    title: 'Оборудование',
    icon: 'computer',
    showInSidebar: true,
    roles: [ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.USER],
  },
  {
    path: '/equipment/:id',
    element: <EquipmentDetailPage />,
    title: 'Детали оборудования',
    showInSidebar: false,
    roles: [ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.USER],
  },
  {
    path: '/reports',
    element: <ReportsPage />,
    title: 'Отчеты',
    icon: 'assessment',
    showInSidebar: true,
    roles: [ROLES.ADMIN, ROLES.TECHNICIAN], // Только для администраторов и техников
  },
  {
    path: '/profile',
    element: <ProfilePage />,
    title: 'Профиль',
    icon: 'person',
    showInSidebar: true,
    roles: [ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.USER],
  },
  // Маршрут для обработки несуществующих путей
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  }
];

// Функция для получения маршрутов, доступных для определенной роли
export const getRoutesByRole = (role) => {
  if (!role) return routes.filter(route => route.public);
  
  return routes.filter(route => 
    route.public || 
    !route.roles || 
    route.roles.includes(role)
  );
};

// Функция для получения маршрутов, которые должны отображаться в боковой панели
export const getSidebarRoutes = (role) => {
  return getRoutesByRole(role).filter(route => route.showInSidebar);
};

// Функция для проверки доступа к маршруту
export const hasRouteAccess = (path, role) => {
  const route = routes.find(r => {
    // Обработка динамических маршрутов (например, /incidents/:id)
    if (r.path.includes(':')) {
      const pathPattern = r.path.replace(/:\w+/g, '[^/]+');
      const regex = new RegExp(`^${pathPattern}$`);
      return regex.test(path);
    }
    return r.path === path;
  });

  if (!route) return false;
  if (route.public) return true;
  if (!route.roles) return true;
  
  return role && route.roles.includes(role);
};

export default routes;