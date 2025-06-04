from functools import wraps
from flask import g, jsonify


def role_required(roles):
    if isinstance(roles, str):
        roles_set = {roles}
    else:
        roles_set = set(roles)

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            user = getattr(g, 'current_user', None)
            if not user or user.get('role') not in roles_set:
                return jsonify({'error': 'Forbidden'}), 403
            return func(*args, **kwargs)
        return wrapper
    return decorator
