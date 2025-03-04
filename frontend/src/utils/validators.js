/**
 * validators.js
 * Утилиты для валидации данных на стороне клиента в приложении IT Service Desk
 */

import * as yup from 'yup';

/**
 * Регулярные выражения для валидации
 */
export const REGEX = {
  // Только буквы, цифры и некоторые спецсимволы
  ALPHANUMERIC: /^[a-zA-Zа-яА-Я0-9\s_\-\.]+$/,
  // Только буквы (латиница и кириллица)
  ALPHA_ONLY: /^[a-zA-Zа-яА-Я\s]+$/,
  // Только цифры
  NUMERIC_ONLY: /^[0-9]+$/,
  // Email
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  // Телефон (российский формат)
  PHONE_RU: /^(\+7|7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/,
  // MAC-адрес
  MAC_ADDRESS: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
  // IP-адрес
  IP_ADDRESS: /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  // Серийный номер (буквы, цифры, дефисы)
  SERIAL_NUMBER: /^[a-zA-Z0-9\-]+$/,
  // Пароль (минимум 8 символов, хотя бы одна буква и одна цифра)
  PASSWORD: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
};

/**
 * Проверяет, является ли значение пустым
 * @param {*} value - Проверяемое значение
 * @returns {boolean} true если значение пустое, иначе false
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Проверяет, является ли строка валидным email
 * @param {string} email - Email для проверки
 * @returns {boolean} true если email валиден, иначе false
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  return REGEX.EMAIL.test(email);
};

/**
 * Проверяет, является ли строка валидным телефонным номером
 * @param {string} phone - Телефонный номер для проверки
 * @returns {boolean} true если телефон валиден, иначе false
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  return REGEX.PHONE_RU.test(phone);
};

/**
 * Проверяет, является ли строка валидным MAC-адресом
 * @param {string} mac - MAC-адрес для проверки
 * @returns {boolean} true если MAC-адрес валиден, иначе false
 */
export const isValidMacAddress = (mac) => {
  if (!mac) return false;
  return REGEX.MAC_ADDRESS.test(mac);
};

/**
 * Проверяет, является ли строка валидным IP-адресом
 * @param {string} ip - IP-адрес для проверки
 * @returns {boolean} true если IP-адрес валиден, иначе false
 */
export const isValidIpAddress = (ip) => {
  if (!ip) return false;
  return REGEX.IP_ADDRESS.test(ip);
};

/**
 * Проверяет, является ли строка валидным серийным номером
 * @param {string} serialNumber - Серийный номер для проверки
 * @returns {boolean} true если серийный номер валиден, иначе false
 */
export const isValidSerialNumber = (serialNumber) => {
  if (!serialNumber) return false;
  return REGEX.SERIAL_NUMBER.test(serialNumber);
};

/**
 * Проверяет, является ли строка валидным паролем
 * @param {string} password - Пароль для проверки
 * @returns {boolean} true если пароль валиден, иначе false
 */
export const isValidPassword = (password) => {
  if (!password) return false;
  return REGEX.PASSWORD.test(password);
};

/**
 * Проверяет, является ли значение числом в заданном диапазоне
 * @param {number} value - Значение для проверки
 * @param {number} min - Минимальное значение (включительно)
 * @param {number} max - Максимальное значение (включительно)
 * @returns {boolean} true если значение в диапазоне, иначе false
 */
export const isInRange = (value, min, max) => {
  const num = Number(value);
  if (isNaN(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
};

/**
 * Проверяет, является ли строка валидной датой
 * @param {string} dateString - Строка с датой для проверки
 * @returns {boolean} true если дата валидна, иначе false
 */
export const isValidDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * Проверяет, является ли дата в будущем
 * @param {string|Date} date - Дата для проверки
 * @returns {boolean} true если дата в будущем, иначе false
 */
export const isFutureDate = (date) => {
  if (!date) return false;
  const checkDate = date instanceof Date ? date : new Date(date);
  if (isNaN(checkDate.getTime())) return false;
  return checkDate > new Date();
};

/**
 * Проверяет, является ли дата в прошлом
 * @param {string|Date} date - Дата для проверки
 * @returns {boolean} true если дата в прошлом, иначе false
 */
export const isPastDate = (date) => {
  if (!date) return false;
  const checkDate = date instanceof Date ? date : new Date(date);
  if (isNaN(checkDate.getTime())) return false;
  return checkDate < new Date();
};

/**
 * Проверяет, соответствует ли строка минимальной и максимальной длине
 * @param {string} str - Строка для проверки
 * @param {number} min - Минимальная длина (включительно)
 * @param {number} max - Максимальная длина (включительно)
 * @returns {boolean} true если длина строки в заданном диапазоне, иначе false
 */
export const isValidLength = (str, min, max) => {
  if (str === null || str === undefined) return false;
  const length = String(str).length;
  if (min !== undefined && length < min) return false;
  if (max !== undefined && length > max) return false;
  return true;
};

/**
 * Проверяет, содержит ли массив только уникальные значения
 * @param {Array} array - Массив для проверки
 * @returns {boolean} true если все значения уникальны, иначе false
 */
export const hasUniqueValues = (array) => {
  if (!Array.isArray(array)) return false;
  return (new Set(array)).size === array.length;
};

/**
 * Проверяет, соответствует ли объект заданной схеме
 * @param {Object} data - Объект для проверки
 * @param {Object} schema - Схема для проверки (ключи и типы значений)
 * @returns {boolean} true если объект соответствует схеме, иначе false
 */
export const matchesSchema = (data, schema) => {
  if (!data || !schema) return false;
  
  for (const key in schema) {
    if (schema.hasOwnProperty(key)) {
      const expectedType = schema[key];
      
      // Проверка наличия ключа
      if (!(key in data)) return false;
      
      // Проверка типа значения
      const actualValue = data[key];
      if (expectedType === 'string' && typeof actualValue !== 'string') return false;
      if (expectedType === 'number' && typeof actualValue !== 'number') return false;
      if (expectedType === 'boolean' && typeof actualValue !== 'boolean') return false;
      if (expectedType === 'array' && !Array.isArray(actualValue)) return false;
      if (expectedType === 'object' && (typeof actualValue !== 'object' || actualValue === null || Array.isArray(actualValue))) return false;
    }
  }
  
  return true;
};

/**
 * Схемы валидации Yup для форм
 */
export const validationSchemas = {
  /**
   * Схема для формы авторизации
   */
  login: yup.object({
    email: yup
      .string()
      .email('Введите корректный email')
      .required('Email обязателен'),
    password: yup
      .string()
      .required('Пароль обязателен')
      .min(8, 'Пароль должен содержать минимум 8 символов'),
  }),

  /**
   * Схема для формы регистрации
   */
  register: yup.object({
    firstName: yup
      .string()
      .required('Имя обязательно')
      .matches(REGEX.ALPHA_ONLY, 'Имя должно содержать только буквы')
      .min(2, 'Имя должно содержать минимум 2 символа')
      .max(50, 'Имя должно содержать максимум 50 символов'),
    lastName: yup
      .string()
      .required('Фамилия обязательна')
      .matches(REGEX.ALPHA_ONLY, 'Фамилия должна содержать только буквы')
      .min(2, 'Фамилия должна содержать минимум 2 символа')
      .max(50, 'Фамилия должна содержать максимум 50 символов'),
    email: yup
      .string()
      .email('Введите корректный email')
      .required('Email обязателен'),
    password: yup
      .string()
      .required('Пароль обязателен')
      .min(8, 'Пароль должен содержать минимум 8 символов')
      .matches(
        REGEX.PASSWORD,
        'Пароль должен содержать минимум 8 символов, включая буквы и цифры'
      ),
    confirmPassword: yup
      .string()
      .required('Подтверждение пароля обязательно')
      .oneOf([yup.ref('password'), null], 'Пароли должны совпадать'),
    phone: yup
      .string()
      .matches(REGEX.PHONE_RU, 'Введите корректный номер телефона'),
    department: yup
      .string()
      .required('Отдел обязателен'),
    role: yup
      .string()
      .required('Роль обязательна'),
  }),

  /**
   * Схема для формы создания/редактирования инцидента
   */
  incident: yup.object({
    title: yup
      .string()
      .required('Заголовок обязателен')
      .min(5, 'Заголовок должен содержать минимум 5 символов')
      .max(100, 'Заголовок должен содержать максимум 100 символов'),
    description: yup
      .string()
      .required('Описание обязательно')
      .min(10, 'Описание должно содержать минимум 10 символов')
      .max(1000, 'Описание должно содержать максимум 1000 символов'),
    priority: yup
      .string()
      .required('Приоритет обязателен')
      .oneOf(['low', 'medium', 'high', 'critical'], 'Некорректный приоритет'),
    category: yup
      .string()
      .required('Категория обязательна'),
    assignedTo: yup
      .string(),
    equipment: yup
      .string(),
    dueDate: yup
      .date()
      .nullable()
      .min(new Date(), 'Дата должна быть в будущем'),
    attachments: yup
      .array()
      .of(
        yup.mixed().test(
          'fileSize',
          'Размер файла не должен превышать 5MB',
          (value) => !value || value.size <= 5 * 1024 * 1024
        )
      ),
  }),

  /**
   * Схема для формы создания/редактирования оборудования
   */
  equipment: yup.object({
    name: yup
      .string()
      .required('Название обязательно')
      .min(2, 'Название должно содержать минимум 2 символа')
      .max(100, 'Название должно содержать максимум 100 символов'),
    type: yup
      .string()
      .required('Тип оборудования обязателен'),
    serialNumber: yup
      .string()
      .required('Серийный номер обязателен')
      .matches(REGEX.SERIAL_NUMBER, 'Некорректный серийный номер'),
    inventoryNumber: yup
      .string()
      .required('Инвентарный номер обязателен'),
    location: yup
      .string()
      .required('Местоположение обязательно'),
    purchaseDate: yup
      .date()
      .nullable()
      .max(new Date(), 'Дата не может быть в будущем'),
    warrantyExpiration: yup
      .date()
      .nullable(),
    status: yup
      .string()
      .required('Статус обязателен')
      .oneOf(['active', 'repair', 'decommissioned', 'reserved'], 'Некорректный статус'),
    assignedTo: yup
      .string(),
    ipAddress: yup
      .string()
      .nullable()
      .test('is-valid-ip', 'Некорректный IP-адрес', (value) => 
        !value || isValidIpAddress(value)
      ),
    macAddress: yup
      .string()
      .nullable()
      .test('is-valid-mac', 'Некорректный MAC-адрес', (value) => 
        !value || isValidMacAddress(value)
      ),
    notes: yup
      .string()
      .max(500, 'Примечания должны содержать максимум 500 символов'),
  }),

  /**
   * Схема для формы профиля пользователя
   */
  profile: yup.object({
    firstName: yup
      .string()
      .required('Имя обязательно')
      .matches(REGEX.ALPHA_ONLY, 'Имя должно содержать только буквы')
      .min(2, 'Имя должно содержать минимум 2 символа')
      .max(50, 'Имя должно содержать максимум 50 символов'),
    lastName: yup
      .string()
      .required('Фамилия обязательна')
      .matches(REGEX.ALPHA_ONLY, 'Фамилия должна содержать только буквы')
      .min(2, 'Фамилия должна содержать минимум 2 символа')
      .max(50, 'Фамилия должна содержать максимум 50 символов'),
    email: yup
      .string()
      .email('Введите корректный email')
      .required('Email обязателен'),
    phone: yup
      .string()
      .matches(REGEX.PHONE_RU, 'Введите корректный номер телефона'),
    department: yup
      .string()
      .required('Отдел обязателен'),
    position: yup
      .string(),
    avatar: yup
      .mixed()
      .test(
        'fileSize',
        'Размер файла не должен превышать 2MB',
        (value) => !value || value.size <= 2 * 1024 * 1024
      )
      .test(
        'fileType',
        'Поддерживаются только изображения (jpg, jpeg, png)',
        (value) => !value || ['image/jpeg', 'image/jpg', 'image/png'].includes(value.type)
      ),
  }),

  /**
   * Схема для формы изменения пароля
   */
  changePassword: yup.object({
    currentPassword: yup
      .string()
      .required('Текущий пароль обязателен'),
    newPassword: yup
      .string()
      .required('Новый пароль обязателен')
      .min(8, 'Пароль должен содержать минимум 8 символов')
      .matches(
        REGEX.PASSWORD,
        'Пароль должен содержать минимум 8 символов, включая буквы и цифры'
      )
      .notOneOf([yup.ref('currentPassword')], 'Новый пароль должен отличаться от текущего'),
    confirmPassword: yup
      .string()
      .required('Подтверждение пароля обязательно')
      .oneOf([yup.ref('newPassword'), null], 'Пароли должны совпадать'),
  }),

  /**
   * Схема для формы создания отчета
   */
  report: yup.object({
    reportType: yup
      .string()
      .required('Тип отчета обязателен')
      .oneOf(['incidents', 'equipment', 'users', 'performance'], 'Некорректный тип отчета'),
    dateFrom: yup
      .date()
      .required('Начальная дата обязательна')
      .max(new Date(), 'Дата не может быть в будущем'),
    dateTo: yup
      .date()
      .required('Конечная дата обязательна')
      .max(new Date(), 'Дата не может быть в будущем')
      .min(
        yup.ref('dateFrom'),
        'Конечная дата должна быть позже начальной'
      ),
    format: yup
      .string()
      .required('Формат отчета обязателен')
      .oneOf(['pdf', 'excel', 'csv'], 'Некорректный формат отчета'),
    includeCharts: yup
      .boolean(),
    filters: yup
      .object(),
  }),
};

/**
 * Функция для проверки наличия всех обязательных полей в объекте
 * @param {Object} data - Объект для проверки
 * @param {Array<string>} requiredFields - Массив обязательных полей
 * @returns {Array<string>} Массив отсутствующих полей
 */
export const validateRequiredFields = (data, requiredFields) => {
  if (!data || !requiredFields) return requiredFields || [];
  
  return requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || 
           (typeof value === 'string' && value.trim() === '') ||
           (Array.isArray(value) && value.length === 0);
  });
};

/**
 * Функция для валидации объекта по схеме Yup
 * @param {Object} data - Объект для валидации
 * @param {Object} schema - Схема Yup
 * @returns {Promise<{isValid: boolean, errors: Object}>} Результат валидации
 */
export const validateWithSchema = async (data, schema) => {
  try {
    await schema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (error) {
    const errors = {};
    if (error.inner) {
      error.inner.forEach(err => {
        errors[err.path] = err.message;
      });
    }
    return { isValid: false, errors };
  }
};

export default {
  REGEX,
  isEmpty,
  isValidEmail,
  isValidPhone,
  isValidMacAddress,
  isValidIpAddress,
  isValidSerialNumber,
  isValidPassword,
  isInRange,
  isValidDate,
  isFutureDate,
  isPastDate,
  isValidLength,
  hasUniqueValues,
  matchesSchema,
  validationSchemas,
  validateRequiredFields,
  validateWithSchema
};