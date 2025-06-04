import bcrypt
import re
from typing import Tuple, Optional
import secrets
import string
import logging

# Настройка логирования
logger = logging.getLogger(__name__)

class PasswordUtil:
    """
    Утилита для работы с паролями: хеширование, проверка, генерация и валидация.
    """
    
    # Константы для валидации паролей
    MIN_PASSWORD_LENGTH = 8
    MAX_PASSWORD_LENGTH = 64
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL_CHAR = True
    SPECIAL_CHARS = "!@#$%^&*()-_=+[]{}|;:,.<>?/~"
    
    @staticmethod
    def hash_password(password: str) -> str:
        """
        Хеширует пароль с использованием bcrypt
        
        Args:
            password: Пароль в открытом виде
            
        Returns:
            str: Хешированный пароль
        """
        if not password:
            raise ValueError("Password cannot be empty")
            
        # Преобразуем пароль в байты, если он в виде строки
        if isinstance(password, str):
            password = password.encode('utf-8')
            
        # Генерируем соль и хешируем пароль
        salt = bcrypt.gensalt(rounds=12)  # 12 раундов - хороший баланс между безопасностью и производительностью
        hashed = bcrypt.hashpw(password, salt)
        
        # Возвращаем хеш в виде строки
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        Проверяет, соответствует ли пароль в открытом виде хешированному паролю
        
        Args:
            plain_password: Пароль в открытом виде
            hashed_password: Хешированный пароль
            
        Returns:
            bool: True, если пароль соответствует хешу, иначе False
        """
        if not plain_password or not hashed_password:
            return False
            
        # Преобразуем пароли в байты, если они в виде строки
        if isinstance(plain_password, str):
            plain_password = plain_password.encode('utf-8')
        if isinstance(hashed_password, str):
            hashed_password = hashed_password.encode('utf-8')
            
        try:
            return bcrypt.checkpw(plain_password, hashed_password)
        except Exception as e:
            logger.error(f"Error verifying password: {str(e)}")
            return False
    
    @classmethod
    def validate_password(cls, password: str) -> Tuple[bool, Optional[str]]:
        """
        Проверяет пароль на соответствие требованиям безопасности
        
        Args:
            password: Пароль для проверки
            
        Returns:
            Tuple[bool, Optional[str]]: (Валиден ли пароль, Сообщение об ошибке или None)
        """
        # Проверка длины пароля
        if not password:
            return False, "Password cannot be empty"
            
        if len(password) < cls.MIN_PASSWORD_LENGTH:
            return False, f"Password must be at least {cls.MIN_PASSWORD_LENGTH} characters long"
            
        if len(password) > cls.MAX_PASSWORD_LENGTH:
            return False, f"Password cannot exceed {cls.MAX_PASSWORD_LENGTH} characters"
        
        # Проверка на наличие заглавных букв
        if cls.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            return False, "Password must contain at least one uppercase letter"
        
        # Проверка на наличие строчных букв
        if cls.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            return False, "Password must contain at least one lowercase letter"
        
        # Проверка на наличие цифр
        if cls.REQUIRE_DIGIT and not re.search(r'\d', password):
            return False, "Password must contain at least one digit"
        
        # Проверка на наличие специальных символов
        if cls.REQUIRE_SPECIAL_CHAR and not any(char in cls.SPECIAL_CHARS for char in password):
            return False, f"Password must contain at least one special character ({cls.SPECIAL_CHARS})"
        
        # Проверка на распространенные пароли (можно расширить)
        common_passwords = ["password", "123456", "qwerty", "admin", "welcome"]
        if password.lower() in common_passwords:
            return False, "Password is too common and easily guessable"
        
        return True, None
    
    @classmethod
    def generate_password(cls, length: int = 12) -> str:
        """
        Генерирует случайный безопасный пароль
        
        Args:
            length: Длина генерируемого пароля (по умолчанию 12)
            
        Returns:
            str: Сгенерированный пароль
        """
        if length < cls.MIN_PASSWORD_LENGTH:
            length = cls.MIN_PASSWORD_LENGTH
            
        # Определяем набор символов для пароля
        uppercase_letters = string.ascii_uppercase
        lowercase_letters = string.ascii_lowercase
        digits = string.digits
        special_chars = cls.SPECIAL_CHARS
        
        # Убеждаемся, что пароль будет содержать как минимум по одному символу каждого типа
        password = [
            secrets.choice(uppercase_letters),
            secrets.choice(lowercase_letters),
            secrets.choice(digits),
            secrets.choice(special_chars)
        ]
        
        # Добавляем остальные символы
        all_chars = uppercase_letters + lowercase_letters + digits + special_chars
        password.extend(secrets.choice(all_chars) for _ in range(length - 4))
        
        # Перемешиваем символы
        secrets.SystemRandom().shuffle(password)
        
        # Объединяем в строку
        return ''.join(password)
    
    @staticmethod
    def password_strength_score(password: str) -> int:
        """
        Оценивает силу пароля по шкале от 0 до 100
        
        Args:
            password: Пароль для оценки
            
        Returns:
            int: Оценка силы пароля (0-100)
        """
        if not password:
            return 0
            
        score = 0
        
        # Базовая оценка за длину (до 50 баллов)
        length_score = min(50, len(password) * 2)
        score += length_score
        
        # Дополнительные баллы за разнообразие символов
        if re.search(r'[A-Z]', password):
            score += 10
        if re.search(r'[a-z]', password):
            score += 10
        if re.search(r'\d', password):
            score += 10
        if any(char in PasswordUtil.SPECIAL_CHARS for char in password):
            score += 10
        
        # Штраф за повторяющиеся символы
        repeats = len(password) - len(set(password))
        score -= repeats * 2
        
        # Штраф за последовательности
        for i in range(len(password) - 2):
            if (ord(password[i]) + 1 == ord(password[i+1]) and 
                ord(password[i+1]) + 1 == ord(password[i+2])):
                score -= 5
                break
        
        # Ограничиваем оценку диапазоном 0-100
        return max(0, min(100, score))
    
    @staticmethod
    def is_password_compromised(password: str) -> bool:
        """
        Проверяет, был ли пароль скомпрометирован, используя API Have I Been Pwned
        Примечание: Эта функция требует внешних зависимостей и подключения к интернету
        
        Args:
            password: Пароль для проверки
            
        Returns:
            bool: True, если пароль был скомпрометирован, иначе False
        """
        # Эта функция может быть реализована с использованием API Have I Been Pwned
        # или другого сервиса проверки скомпрометированных паролей
        # Для простоты в этой версии возвращаем False
        logger.warning("Password compromise check is not implemented")
        return False


def hash_password(password: str) -> str:
    return PasswordUtil.hash_password(password)


def check_password(plain_password: str, hashed_password: str) -> bool:
    return PasswordUtil.verify_password(plain_password, hashed_password)
