import React, { useState, useEffect, useContext } from 'react';
import { Card, Row, Col, Spin, Alert, Typography, Statistic, Tabs } from 'antd';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { UserOutlined, ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

import IncidentAPI from '../api/incidentAPI';
import NotificationAPI from '../api/notificationAPI';
import AnalyticsAPI from '../api/analyticsAPI';
import { AuthContext } from '../contexts/AuthContext';
import NotificationList from '../components/NotificationList';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

/**
 * Главная страница с аналитикой и дашбордом
 */
const DashboardPage = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Параллельная загрузка данных
        const [analyticsData, incidentsData, notificationsData] = await Promise.all([
          AnalyticsAPI.getDashboardAnalytics(),
          IncidentAPI.getIncidents({ limit: 5, sort: 'createdAt:desc' }),
          NotificationAPI.getNotifications()
        ]);
        
        setAnalytics(analyticsData);
        setRecentIncidents(incidentsData);
        setNotifications(notificationsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Не удалось загрузить данные дашборда. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Подписка на уведомления
    const subscription = NotificationAPI.subscribeToNotifications((newNotifications) => {
      setNotifications(prev => {
        // Объединяем новые уведомления с существующими, избегая дубликатов
        const existingIds = new Set(prev.map(n => n.id));
        const uniqueNewNotifications = newNotifications.filter(n => !existingIds.has(n.id));
        return [...uniqueNewNotifications, ...prev];
      });
    });

    // Отписка при размонтировании компонента
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <Spin size="large" tip="Загрузка данных..." />;
  }

  if (error) {
    return <Alert message="Ошибка" description={error} type="error" showIcon />;
  }

  return (
    <div className="dashboard-container">
      <Title level={2}>Панель управления</Title>
      <Text type="secondary">Добро пожаловать, {user?.name || 'пользователь'}!</Text>
      
      {/* Статистика */}
      <Row gutter={[16, 16]} className="stats-row" style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="Активные инциденты" 
              value={analytics?.activeIncidents || 0} 
              prefix={<ExclamationCircleOutlined />} 
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="Решено за неделю" 
              value={analytics?.resolvedThisWeek || 0} 
              prefix={<CheckCircleOutlined />} 
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="Среднее время решения" 
              value={analytics?.avgResolutionTime || 0} 
              suffix="ч" 
              prefix={<ClockCircleOutlined />} 
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="Всего пользователей" 
              value={analytics?.totalUsers || 0} 
              prefix={<UserOutlined />} 
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="1" style={{ marginTop: 24 }}>
        <TabPane tab="Аналитика" key="1">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card title="Инциденты по статусам">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics?.incidentsByStatus || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="Инциденты по приоритету">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={analytics?.incidentsByPriority || []}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" name="Количество" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24}>
              <Card title="Динамика инцидентов за последние 30 дней">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={analytics?.incidentsTrend || []}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="created" stroke="#8884d8" name="Создано" />
                    <Line type="monotone" dataKey="resolved" stroke="#82ca9d" name="Решено" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </TabPane>
        <TabPane tab="Последние инциденты" key="2">
          <Card>
            {recentIncidents.length > 0 ? (
              <div className="incident-list">
                {recentIncidents.map(incident => (
                  <Card.Grid key={incident.id} style={{ width: '100%', padding: '16px' }}>
                    <Row>
                      <Col span={16}>
                        <Title level={4}>{incident.title}</Title>
                        <Text type="secondary">ID: {incident.id}</Text>
                        <p>{incident.description}</p>
                      </Col>
                      <Col span={8} style={{ textAlign: 'right' }}>
                        <div>
                          <Text strong>Статус: </Text>
                          <Text type={incident.status === 'resolved' ? 'success' : incident.status === 'in_progress' ? 'warning' : 'danger'}>
                            {incident.status}
                          </Text>
                        </div>
                        <div>
                          <Text strong>Приоритет: </Text>
                          <Text>{incident.priority}</Text>
                        </div>
                        <div>
                          <Text strong>Создан: </Text>
                          <Text>{new Date(incident.createdAt).toLocaleString()}</Text>
                        </div>
                      </Col>
                    </Row>
                  </Card.Grid>
                ))}
              </div>
            ) : (
              <Empty description="Нет недавних инцидентов" />
            )}
          </Card>
        </TabPane>
        <TabPane tab={`Уведомления (${notifications.filter(n => !n.read).length})`} key="3">
          <Card>
            <NotificationList 
              notifications={notifications} 
              onMarkAsRead={(id) => {
                NotificationAPI.markAsRead(id);
                setNotifications(prev => 
                  prev.map(n => n.id === id ? { ...n, read: true } : n)
                );
              }} 
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default DashboardPage;