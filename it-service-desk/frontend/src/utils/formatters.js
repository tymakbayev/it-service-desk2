/**
 * formatters.js
 * Утилиты для форматирования данных в приложении IT Service Desk
 */

import { format, formatDistance, formatRelative, parseISO, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Форматирует дату в локализованный строковый формат
 * @param {string|Date} date - Дата в формате ISO или объект Date
 * @param {string} formatStr - Строка формата (по умолчанию 'dd.MM.yyyy')
 * @returns {string} Отформатированная дата
 */
export const formatDate = (date, formatStr = 'dd.MM.yyyy') => {
  if (!date) return 'Н/Д';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      return 'Некорректная дата';
    }
    
    return format(dateObj, formatStr, { locale: ru });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Ошибка формата';
  }
};

/**
 * Форматирует дату и время в локализованный строковый формат
 * @param {string|Date} date - Дата в формате ISO или объект Date
 * @param {string} formatStr - Строка формата (по умолчанию 'dd.MM.yyyy HH:mm')
 * @returns {string} Отформатированная дата и время
 */
export const formatDateTime = (date, formatStr = 'dd.MM.yyyy HH:mm') => {
  return formatDate(date, formatStr);
};

/**
 * Возвращает относительное время (например, "5 минут назад")
 * @param {string|Date} date - Дата в формате ISO или объект Date
 * @param {Date} baseDate - Базовая дата для сравнения (по умолчанию текущая)
 * @returns {string} Относительное время
 */
export const formatRelativeTime = (date, baseDate = new Date()) => {
  if (!date) return 'Н/Д';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      return 'Некорректная дата';
    }
    
    return formatDistance(dateObj, baseDate, { 
      addSuffix: true,
      locale: ru
    });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Ошибка формата';
  }
};

/**
 * Форматирует относительную дату (например, "вчера в 14:30")
 * @param {string|Date} date - Дата в формате ISO или объект Date
 * @param {Date} baseDate - Базовая дата для сравнения (по умолчанию текущая)
 * @returns {string} Относительная дата
 */
export const formatRelativeDate = (date, baseDate = new Date()) => {
  if (!date) return 'Н/Д';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      return 'Некорректная дата';
    }
    
    return formatRelative(dateObj, baseDate, { locale: ru });
  } catch (error) {
    console.error('Error formatting relative date:', error);
    return 'Ошибка формата';
  }
};

/**
 * Форматирует денежную сумму
 * @param {number} amount - Сумма
 * @param {string} currency - Валюта (по умолчанию 'RUB')
 * @returns {string} Отформатированная сумма
 */
export const formatCurrency = (amount, currency = 'RUB') => {
  if (amount === null || amount === undefined) return 'Н/Д';
  
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return 'Ошибка формата';
  }
};

/**
 * Форматирует число с разделителями разрядов
 * @param {number} number - Число для форматирования
 * @param {number} decimals - Количество десятичных знаков (по умолчанию 0)
 * @returns {string} Отформатированное число
 */
export const formatNumber = (number, decimals = 0) => {
  if (number === null || number === undefined) return 'Н/Д';
  
  try {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(number);
  } catch (error) {
    console.error('Error formatting number:', error);
    return 'Ошибка формата';
  }
};

/**
 * Форматирует процент
 * @param {number} value - Значение (0-1 или 0-100)
 * @param {boolean} isDecimal - Флаг, указывающий, что значение в диапазоне 0-1
 * @param {number} decimals - Количество десятичных знаков (по умолчанию 1)
 * @returns {string} Отформатированный процент
 */
export const formatPercent = (value, isDecimal = false, decimals = 1) => {
  if (value === null || value === undefined) return 'Н/Д';
  
  try {
    // Если значение в диапазоне 0-1, умножаем на 100
    const percentValue = isDecimal ? value * 100 : value;
    
    return new Intl.NumberFormat('ru-RU', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(percentValue / 100);
  } catch (error) {
    console.error('Error formatting percent:', error);
    return 'Ошибка формата';
  }
};

/**
 * Форматирует размер файла в человекочитаемый формат
 * @param {number} bytes - Размер в байтах
 * @param {number} decimals - Количество десятичных знаков (по умолчанию 2)
 * @returns {string} Отформатированный размер файла
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Байт';
  if (!bytes) return 'Н/Д';
  
  const k = 1024;
  const sizes = ['Байт', 'КБ', 'МБ', 'ГБ', 'ТБ', 'ПБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

/**
 * Форматирует имя пользователя в формат "Фамилия И.О."
 * @param {Object} user - Объект пользователя
 * @param {string} user.firstName - Имя
 * @param {string} user.lastName - Фамилия
 * @param {string} user.middleName - Отчество (опционально)
 * @returns {string} Отформатированное имя пользователя
 */
export const formatUserName = (user) => {
  if (!user) return 'Н/Д';
  
  const { firstName, lastName, middleName } = user;
  
  if (!firstName || !lastName) {
    return user.username || 'Неизвестный пользователь';
  }
  
  const firstNameInitial = firstName.charAt(0).toUpperCase();
  const middleNameInitial = middleName ? middleName.charAt(0).toUpperCase() + '.' : '';
  
  return `${lastName} ${firstNameInitial}.${middleNameInitial}`;
};

/**
 * Форматирует полное имя пользователя
 * @param {Object} user - Объект пользователя
 * @param {string} user.firstName - Имя
 * @param {string} user.lastName - Фамилия
 * @param {string} user.middleName - Отчество (опционально)
 * @returns {string} Полное имя пользователя
 */
export const formatFullName = (user) => {
  if (!user) return 'Н/Д';
  
  const { firstName, lastName, middleName } = user;
  
  if (!firstName || !lastName) {
    return user.username || 'Неизвестный пользователь';
  }
  
  return `${lastName} ${firstName}${middleName ? ' ' + middleName : ''}`;
};

/**
 * Форматирует статус инцидента в человекочитаемый вид
 * @param {string} status - Код статуса инцидента
 * @returns {string} Человекочитаемый статус
 */
export const formatIncidentStatus = (status) => {
  if (!status) return 'Неизвестно';
  
  const statusMap = {
    'new': 'Новый',
    'in_progress': 'В работе',
    'waiting': 'Ожидание',
    'resolved': 'Решен',
    'closed': 'Закрыт',
    'cancelled': 'Отменен'
  };
  
  return statusMap[status] || status;
};

/**
 * Форматирует приоритет инцидента в человекочитаемый вид
 * @param {string} priority - Код приоритета инцидента
 * @returns {string} Человекочитаемый приоритет
 */
export const formatIncidentPriority = (priority) => {
  if (!priority) return 'Неизвестно';
  
  const priorityMap = {
    'low': 'Низкий',
    'medium': 'Средний',
    'high': 'Высокий',
    'critical': 'Критический'
  };
  
  return priorityMap[priority] || priority;
};

/**
 * Форматирует тип оборудования в человекочитаемый вид
 * @param {string} type - Код типа оборудования
 * @returns {string} Человекочитаемый тип
 */
export const formatEquipmentType = (type) => {
  if (!type) return 'Неизвестно';
  
  const typeMap = {
    'computer': 'Компьютер',
    'laptop': 'Ноутбук',
    'printer': 'Принтер',
    'scanner': 'Сканер',
    'network': 'Сетевое оборудование',
    'server': 'Сервер',
    'phone': 'Телефон',
    'other': 'Другое'
  };
  
  return typeMap[type] || type;
};

/**
 * Форматирует статус оборудования в человекочитаемый вид
 * @param {string} status - Код статуса оборудования
 * @returns {string} Человекочитаемый статус
 */
export const formatEquipmentStatus = (status) => {
  if (!status) return 'Неизвестно';
  
  const statusMap = {
    'active': 'Активно',
    'repair': 'В ремонте',
    'storage': 'На складе',
    'decommissioned': 'Списано'
  };
  
  return statusMap[status] || status;
};

/**
 * Сокращает текст до указанной длины с добавлением многоточия
 * @param {string} text - Исходный текст
 * @param {number} maxLength - Максимальная длина (по умолчанию 100)
 * @returns {string} Сокращенный текст
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength) + '...';
};

/**
 * Форматирует телефонный номер в формат +7 (XXX) XXX-XX-XX
 * @param {string} phone - Телефонный номер
 * @returns {string} Отформатированный телефонный номер
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return 'Н/Д';
  
  // Удаляем все нецифровые символы
  const cleaned = ('' + phone).replace(/\D/g, '');
  
  // Проверяем длину
  if (cleaned.length !== 11) {
    return phone;
  }
  
  // Форматируем номер
  return `+${cleaned[0]} (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 9)}-${cleaned.substring(9, 11)}`;
};

/**
 * Форматирует продолжительность в человекочитаемый вид
 * @param {number} minutes - Продолжительность в минутах
 * @returns {string} Отформатированная продолжительность
 */
export const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined) return 'Н/Д';
  
  if (minutes < 60) {
    return `${minutes} мин.`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} ч.`;
  }
  
  return `${hours} ч. ${remainingMinutes} мин.`;
};

/**
 * Форматирует IP-адрес
 * @param {string} ip - IP-адрес
 * @returns {string} Отформатированный IP-адрес
 */
export const formatIpAddress = (ip) => {
  if (!ip) return 'Н/Д';
  
  // Простая проверка формата IPv4
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  if (ipv4Regex.test(ip)) {
    return ip;
  }
  
  // Если это не IPv4, возвращаем как есть
  return ip;
};

/**
 * Форматирует MAC-адрес в формат XX:XX:XX:XX:XX:XX
 * @param {string} mac - MAC-адрес
 * @returns {string} Отформатированный MAC-адрес
 */
export const formatMacAddress = (mac) => {
  if (!mac) return 'Н/Д';
  
  // Удаляем все нецифровые и не буквенные символы (кроме a-f, A-F)
  const cleaned = mac.replace(/[^0-9a-fA-F]/g, '');
  
  // Проверяем длину
  if (cleaned.length !== 12) {
    return mac;
  }
  
  // Форматируем MAC-адрес
  return cleaned.match(/.{2}/g).join(':').toUpperCase();
};

/**
 * Форматирует роль пользователя в человекочитаемый вид
 * @param {string} role - Код роли пользователя
 * @returns {string} Человекочитаемая роль
 */
export const formatUserRole = (role) => {
  if (!role) return 'Неизвестно';
  
  const roleMap = {
    'admin': 'Администратор',
    'technician': 'Техник',
    'user': 'Пользователь'
  };
  
  return roleMap[role] || role;
};