import re
import json
from typing import Dict, Any, List, Optional, Union, Tuple, Callable
from datetime import datetime
from email_validator import validate_email, EmailNotValidError
from marshmallow import ValidationError

class Validator:
    """
    Базовый класс для валидации данных в приложении.
    Предоставляет общие методы валидации для различных типов данных.
    """
    
    @staticmethod
    def validate_required(data: Dict[str, Any], required_fields: List[str]) -> List[str]:
        """
        Проверяет наличие всех обязательных полей в данных.
        
        Args:
            data: Словарь с данными для проверки
            required_fields: Список обязательных полей
            
        Returns:
            List[str]: Список отсутствующих полей
        """
        missing_fields = []
        for field in required_fields:
            if field not in data or data[field] is None or (isinstance(data[field], str) and data[field].strip() == ''):
                missing_fields.append(field)
        return missing_fields
    
    @staticmethod
    def validate_email(email: str) -> Tuple[bool, Optional[str]]:
        """
        Проверяет корректность email адреса.
        
        Args:
            email: Email адрес для проверки
            
        Returns:
            Tuple[bool, Optional[str]]: (True, None) если email корректен, иначе (False, сообщение об ошибке)
        """
        try:
            # Проверка и нормализация email
            valid = validate_email(email)
            return True, None
        except EmailNotValidError as e:
            return False, str(e)
    
    @staticmethod
    def validate_length(value: str, min_length: int = None, max_length: int = None) -> Tuple[bool, Optional[str]]:
        """
        Проверяет длину строки.
        
        Args:
            value: Строка для проверки
            min_length: Минимальная допустимая длина (опционально)
            max_length: Максимальная допустимая длина (опционально)
            
        Returns:
            Tuple[bool, Optional[str]]: (True, None) если длина в допустимом диапазоне, иначе (False, сообщение об ошибке)
        """
        if not isinstance(value, str):
            return False, "Value must be a string"
        
        length = len(value)
        
        if min_length is not None and length < min_length:
            return False, f"Value must be at least {min_length} characters long"
        
        if max_length is not None and length > max_length:
            return False, f"Value must be at most {max_length} characters long"
        
        return True, None
    
    @staticmethod
    def validate_pattern(value: str, pattern: str, error_message: str = "Value does not match the required pattern") -> Tuple[bool, Optional[str]]:
        """
        Проверяет соответствие строки регулярному выражению.
        
        Args:
            value: Строка для проверки
            pattern: Регулярное выражение
            error_message: Сообщение об ошибке
            
        Returns:
            Tuple[bool, Optional[str]]: (True, None) если строка соответствует шаблону, иначе (False, сообщение об ошибке)
        """
        if not isinstance(value, str):
            return False, "Value must be a string"
        
        if re.match(pattern, value):
            return True, None
        else:
            return False, error_message
    
    @staticmethod
    def validate_date(date_str: str, format_str: str = "%Y-%m-%d") -> Tuple[bool, Optional[str]]:
        """
        Проверяет корректность даты и её формата.
        
        Args:
            date_str: Строка с датой
            format_str: Ожидаемый формат даты
            
        Returns:
            Tuple[bool, Optional[str]]: (True, None) если дата корректна, иначе (False, сообщение об ошибке)
        """
        try:
            datetime.strptime(date_str, format_str)
            return True, None
        except ValueError:
            return False, f"Date must be in the format {format_str}"
    
    @staticmethod
    def validate_enum(value: Any, allowed_values: List[Any]) -> Tuple[bool, Optional[str]]:
        """
        Проверяет, что значение входит в список допустимых значений.
        
        Args:
            value: Значение для проверки
            allowed_values: Список допустимых значений
            
        Returns:
            Tuple[bool, Optional[str]]: (True, None) если значение допустимо, иначе (False, сообщение об ошибке)
        """
        if value in allowed_values:
            return True, None
        else:
            return False, f"Value must be one of: {', '.join(map(str, allowed_values))}"
    
    @staticmethod
    def validate_numeric(value: Any, min_value: Union[int, float] = None, max_value: Union[int, float] = None) -> Tuple[bool, Optional[str]]:
        """
        Проверяет, что значение является числом и находится в допустимом диапазоне.
        
        Args:
            value: Значение для проверки
            min_value: Минимальное допустимое значение (опционально)
            max_value: Максимальное допустимое значение (опционально)
            
        Returns:
            Tuple[bool, Optional[str]]: (True, None) если значение допустимо, иначе (False, сообщение об ошибке)
        """
        try:
            num_value = float(value)
            
            if min_value is not None and num_value < min_value:
                return False, f"Value must be at least {min_value}"
            
            if max_value is not None and num_value > max_value:
                return False, f"Value must be at most {max_value}"
            
            return True, None
        except (ValueError, TypeError):
            return False, "Value must be a number"
    
    @staticmethod
    def validate_boolean(value: Any) -> Tuple[bool, Optional[str]]:
        """
        Проверяет, что значение является логическим.
        
        Args:
            value: Значение для проверки
            
        Returns:
            Tuple[bool, Optional[str]]: (True, None) если значение логическое, иначе (False, сообщение об ошибке)
        """
        if isinstance(value, bool):
            return True, None
        
        # Проверка строковых представлений логических значений
        if isinstance(value, str):
            lower_value = value.lower()
            if lower_value in ('true', 'false', '1', '0', 'yes', 'no'):
                return True, None
        
        return False, "Value must be a boolean"
    
    @staticmethod
    def validate_json(value: str) -> Tuple[bool, Optional[str]]:
        """
        Проверяет, что строка является корректным JSON.
        
        Args:
            value: Строка для проверки
            
        Returns:
            Tuple[bool, Optional[str]]: (True, None) если строка является корректным JSON, иначе (False, сообщение об ошибке)
        """
        try:
            json.loads(value)
            return True, None
        except (ValueError, TypeError):
            return False, "Value must be a valid JSON string"


class UserValidator(Validator):
    """
    Валидатор для данных пользователя.
    """
    
    # Регулярные выражения для проверки
    USERNAME_PATTERN = r'^[a-zA-Z0-9_]{3,30}$'
    PASSWORD_PATTERN = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
    PHONE_PATTERN = r'^\+?[0-9]{10,15}$'
    
    @classmethod
    def validate_username(cls, username: str) -> Tuple[bool, Optional[str]]:
        """
        Проверяет корректность имени пользователя.
        
        Args:
            username: Имя пользователя для проверки
            
        Returns:
            Tuple[bool, Optional[str]]: (True, None) если имя корректно, иначе (False, сообщение об ошибке)
        """
        return cls.validate_pattern(
            username, 
            cls.USERNAME_PATTERN, 
            "Username must be 3-30 characters long and contain only letters, numbers, and underscores"
        )
    
    @classmethod
    def validate_password(cls, password: str) -> Tuple[bool, Optional[str]]:
        """
        Проверяет надежность пароля.
        
        Args:
            password: Пароль для проверки
            
        Returns:
            Tuple[bool, Optional[str]]: (True, None) если пароль надежный, иначе (False, сообщение об ошибке)
        """
        # Проверка длины
        length_valid, length_error = cls.validate_length(password, min_length=8)
        if not length_valid:
            return False, length_error
        
        # Проверка сложности
        pattern_valid, pattern_error = cls.validate_pattern(
            password, 
            cls.PASSWORD_PATTERN, 
            "Password must contain at least 8 characters, including uppercase, lowercase, number and special character"
        )
        
        return pattern_valid, pattern_error
    
    @classmethod
    def validate_phone(cls, phone: str) -> Tuple[bool, Optional[str]]:
        """
        Проверяет корректность телефонного номера.
        
        Args:
            phone: Телефонный номер для проверки
            
        Returns:
            Tuple[bool, Optional[str]]: (True, None) если номер корректен, иначе (False, сообщение об ошибке)
        """
        return cls.validate_pattern(
            phone, 
            cls.PHONE_PATTERN, 
            "Phone number must be 10-15 digits, optionally starting with +"
        )
    
    @classmethod
    def validate_user_data(cls, data: Dict[str, Any], is_update: bool = False) -> Dict[str, List[str]]:
        """
        Комплексная валидация данных пользователя.
        
        Args:
            data: Словарь с данными пользователя
            is_update: Флаг, указывающий, что это обновление существующего пользователя
            
        Returns:
            Dict[str, List[str]]: Словарь с ошибками валидации по полям
        """
        errors = {}
        
        # Определяем обязательные поля в зависимости от операции
        required_fields = ['email', 'role']
        if not is_update:
            required_fields.extend(['username', 'password'])
        
        # Проверка обязательных полей
        missing_fields = cls.validate_required(data, required_fields)
        if missing_fields:
            errors['required'] = [f"Missing required fields: {', '.join(missing_fields)}"]
        
        # Валидация email
        if 'email' in data and data['email']:
            email_valid, email_error = cls.validate_email(data['email'])
            if not email_valid:
                errors['email'] = [email_error]
        
        # Валидация имени пользователя
        if 'username' in data and data['username']:
            username_valid, username_error = cls.validate_username(data['username'])
            if not username_valid:
                errors['username'] = [username_error]
        
        # Валидация пароля
        if 'password' in data and data['password']:
            password_valid, password_error = cls.validate_password(data['password'])
            if not password_valid:
                errors['password'] = [password_error]
        
        # Валидация телефона
        if 'phone' in data and data['phone']:
            phone_valid, phone_error = cls.validate_phone(data['phone'])
            if not phone_valid:
                errors['phone'] = [phone_error]
        
        # Валидация роли
        if 'role' in data and data['role']:
            from config.config import Config
            role_valid, role_error = cls.validate_enum(data['role'], Config.USER_ROLES)
            if not role_valid:
                errors['role'] = [role_error]
        
        return errors


class IncidentValidator(Validator):
    """
    Валидатор для данных инцидентов.
    """
    
    # Допустимые значения для полей инцидентов
    PRIORITIES = ['low', 'medium', 'high', 'critical']
    STATUSES = ['new', 'assigned', 'in_progress', 'resolved', 'closed', 'reopened']
    
    @classmethod
    def validate_incident_data(cls, data: Dict[str, Any], is_update: bool = False) -> Dict[str, List[str]]:
        """
        Комплексная валидация данных инцидента.
        
        Args:
            data: Словарь с данными инцидента
            is_update: Флаг, указывающий, что это обновление существующего инцидента
            
        Returns:
            Dict[str, List[str]]: Словарь с ошибками валидации по полям
        """
        errors = {}
        
        # Определяем обязательные поля в зависимости от операции
        required_fields = ['title', 'description']
        if not is_update:
            required_fields.extend(['reporter_id'])
        
        # Проверка обязательных полей
        missing_fields = cls.validate_required(data, required_fields)
        if missing_fields:
            errors['required'] = [f"Missing required fields: {', '.join(missing_fields)}"]
        
        # Валидация заголовка
        if 'title' in data and data['title']:
            title_valid, title_error = cls.validate_length(data['title'], min_length=5, max_length=100)
            if not title_valid:
                errors['title'] = [title_error]
        
        # Валидация описания
        if 'description' in data and data['description']:
            desc_valid, desc_error = cls.validate_length(data['description'], min_length=10, max_length=2000)
            if not desc_valid:
                errors['description'] = [desc_error]
        
        # Валидация приоритета
        if 'priority' in data and data['priority']:
            priority_valid, priority_error = cls.validate_enum(data['priority'], cls.PRIORITIES)
            if not priority_valid:
                errors['priority'] = [priority_error]
        
        # Валидация статуса
        if 'status' in data and data['status']:
            status_valid, status_error = cls.validate_enum(data['status'], cls.STATUSES)
            if not status_valid:
                errors['status'] = [status_error]
        
        # Валидация даты
        if 'due_date' in data and data['due_date']:
            date_valid, date_error = cls.validate_date(data['due_date'])
            if not date_valid:
                errors['due_date'] = [date_error]
        
        return errors


class EquipmentValidator(Validator):
    """
    Валидатор для данных оборудования.
    """
    
    # Допустимые значения для полей оборудования
    STATUSES = ['active', 'maintenance', 'repair', 'decommissioned', 'reserved']
    
    @classmethod
    def validate_equipment_data(cls, data: Dict[str, Any], is_update: bool = False) -> Dict[str, List[str]]:
        """
        Комплексная валидация данных оборудования.
        
        Args:
            data: Словарь с данными оборудования
            is_update: Флаг, указывающий, что это обновление существующего оборудования
            
        Returns:
            Dict[str, List[str]]: Словарь с ошибками валидации по полям
        """
        errors = {}
        
        # Определяем обязательные поля в зависимости от операции
        required_fields = ['name', 'type', 'status']
        if not is_update:
            required_fields.extend(['inventory_number'])
        
        # Проверка обязательных полей
        missing_fields = cls.validate_required(data, required_fields)
        if missing_fields:
            errors['required'] = [f"Missing required fields: {', '.join(missing_fields)}"]
        
        # Валидация названия
        if 'name' in data and data['name']:
            name_valid, name_error = cls.validate_length(data['name'], min_length=2, max_length=100)
            if not name_valid:
                errors['name'] = [name_error]
        
        # Валидация инвентарного номера
        if 'inventory_number' in data and data['inventory_number']:
            inv_valid, inv_error = cls.validate_length(data['inventory_number'], min_length=3, max_length=50)
            if not inv_valid:
                errors['inventory_number'] = [inv_error]
        
        # Валидация статуса
        if 'status' in data and data['status']:
            status_valid, status_error = cls.validate_enum(data['status'], cls.STATUSES)
            if not status_valid:
                errors['status'] = [status_error]
        
        # Валидация даты покупки
        if 'purchase_date' in data and data['purchase_date']:
            date_valid, date_error = cls.validate_date(data['purchase_date'])
            if not date_valid:
                errors['purchase_date'] = [date_error]
        
        # Валидация стоимости
        if 'cost' in data and data['cost'] is not None:
            cost_valid, cost_error = cls.validate_numeric(data['cost'], min_value=0)
            if not cost_valid:
                errors['cost'] = [cost_error]
        
        return errors


def validate_request_data(schema, data: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, List[str]]]:
    """
    Валидирует данные запроса с использованием схемы marshmallow.
    
    Args:
        schema: Схема marshmallow для валидации
        data: Данные для валидации
        
    Returns:
        Tuple[Dict[str, Any], Dict[str, List[str]]]: (Валидированные данные, ошибки валидации)
    """
    errors = {}
    validated_data = {}
    
    try:
        validated_data = schema.load(data)
    except ValidationError as err:
        errors = err.messages
    
    return validated_data, errors


def validate_pagination_params(page: Optional[str] = None, per_page: Optional[str] = None) -> Tuple[int, int]:
    """
    Валидирует параметры пагинации.
    
    Args:
        page: Номер страницы
        per_page: Количество элементов на странице
        
    Returns:
        Tuple[int, int]: (Номер страницы, количество элементов на странице)
    """
    try:
        page_num = int(page) if page is not None else 1
    except ValueError:
        page_num = 1
    
    try:
        per_page_num = int(per_page) if per_page is not None else 10
    except ValueError:
        per_page_num = 10
    
    # Ограничения на параметры пагинации
    page_num = max(1, page_num)
    per_page_num = max(1, min(100, per_page_num))
    
    return page_num, per_page_num


def validate_sort_params(sort_by: Optional[str] = None, sort_order: Optional[str] = None, 
                         allowed_fields: List[str] = None) -> Tuple[Optional[str], str]:
    """
    Валидирует параметры сортировки.
    
    Args:
        sort_by: Поле для сортировки
        sort_order: Порядок сортировки ('asc' или 'desc')
        allowed_fields: Список допустимых полей для сортировки
        
    Returns:
        Tuple[Optional[str], str]: (Поле для сортировки, порядок сортировки)
    """
    # Проверка поля сортировки
    if sort_by is not None and allowed_fields is not None:
        if sort_by not in allowed_fields:
            sort_by = None
    
    # Проверка порядка сортировки
    if sort_order is not None:
        sort_order = sort_order.lower()
        if sort_order not in ('asc', 'desc'):
            sort_order = 'asc'
    else:
        sort_order = 'asc'
    
    return sort_by, sort_order


def validate_date_range(start_date: Optional[str] = None, end_date: Optional[str] = None, 
                        format_str: str = "%Y-%m-%d") -> Tuple[Optional[datetime], Optional[datetime], List[str]]:
    """
    Валидирует диапазон дат.
    
    Args:
        start_date: Начальная дата
        end_date: Конечная дата
        format_str: Формат даты
        
    Returns:
        Tuple[Optional[datetime], Optional[datetime], List[str]]: (Начальная дата, конечная дата, список ошибок)
    """
    errors = []
    start_date_obj = None
    end_date_obj = None
    
    # Валидация начальной даты
    if start_date:
        try:
            start_date_obj = datetime.strptime(start_date, format_str)
        except ValueError:
            errors.append(f"Start date must be in the format {format_str}")
    
    # Валидация конечной даты
    if end_date:
        try:
            end_date_obj = datetime.strptime(end_date, format_str)
        except ValueError:
            errors.append(f"End date must be in the format {format_str}")
    
    # Проверка, что начальная дата не позже конечной
    if start_date_obj and end_date_obj and start_date_obj > end_date_obj:
        errors.append("Start date cannot be later than end date")
    
    return start_date_obj, end_date_obj, errors


def validate_file_upload(file, allowed_extensions: List[str], max_size_mb: int = 5) -> Tuple[bool, Optional[str]]:
    """
    Валидирует загружаемый файл.
    
    Args:
        file: Файл для валидации
        allowed_extensions: Список допустимых расширений
        max_size_mb: Максимальный размер файла в МБ
        
    Returns:
        Tuple[bool, Optional[str]]: (True, None) если файл корректен, иначе (False, сообщение об ошибке)
    """
    if not file:
        return False, "No file provided"
    
    # Проверка расширения файла
    filename = file.filename
    if '.' not in filename:
        return False, "File has no extension"
    
    extension = filename.rsplit('.', 1)[1].lower()
    if extension not in allowed_extensions:
        return False, f"File extension not allowed. Allowed extensions: {', '.join(allowed_extensions)}"
    
    # Проверка размера файла
    max_size_bytes = max_size_mb * 1024 * 1024
    if file.content_length > max_size_bytes:
        return False, f"File is too large. Maximum size is {max_size_mb} MB"
    
    return True, None