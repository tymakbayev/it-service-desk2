from flask import Blueprint, request, jsonify
from services.auth_service import AuthService
from utils.jwt_util import jwt_required
from marshmallow import Schema, fields, validate, ValidationError

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# Validation schemas
class LoginSchema(Schema):
    username = fields.String(required=True)
    password = fields.String(required=True)

class RegisterSchema(Schema):
    username = fields.String(required=True, validate=validate.Length(min=3, max=50))
    password = fields.String(required=True, validate=validate.Length(min=8))
    email = fields.Email(required=True)
    full_name = fields.String(required=True)
    role = fields.String(validate=validate.OneOf(['admin', 'technician', 'user']))

class RefreshSchema(Schema):
    refresh_token = fields.String(required=True)

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    User login endpoint
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: credentials
        schema:
          type: object
          required:
            - username
            - password
          properties:
            username:
              type: string
            password:
              type: string
    responses:
      200:
        description: Login successful
      401:
        description: Invalid credentials
    """
    try:
        # Validate request data
        schema = LoginSchema()
        data = schema.load(request.json)
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    
    # Authenticate user
    result = AuthService.login(data['username'], data['password'])
    
    if not result:
        return jsonify({'error': 'Invalid username or password'}), 401
    
    return jsonify(result), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    User registration endpoint
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: user_data
        schema:
          type: object
          required:
            - username
            - password
            - email
            - full_name
          properties:
            username:
              type: string
            password:
              type: string
            email:
              type: string
            full_name:
              type: string
            role:
              type: string
              enum: [admin, technician, user]
    responses:
      201:
        description: User registered successfully
      400:
        description: Validation error or user already exists
    """
    try:
        # Validate request data
        schema = RegisterSchema()
        user_data = schema.load(request.json)
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    
    # Register user
    user_id = AuthService.register(user_data)
    
    if not user_id:
        return jsonify({'error': 'User with this username or email already exists'}), 400
    
    return jsonify({'message': 'User registered successfully', 'user_id': user_id}), 201

@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    """
    Refresh access token endpoint
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: refresh_token
        schema:
          type: object
          required:
            - refresh_token
          properties:
            refresh_token:
              type: string
    responses:
      200:
        description: Token refreshed successfully
      401:
        description: Invalid refresh token
    """
    try:
        # Validate request data
        schema = RefreshSchema()
        data = schema.load(request.json)
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    
    # Refresh token
    result = AuthService.refresh_token(data['refresh_token'])
    
    if not result:
        return jsonify({'error': 'Invalid refresh token'}), 401
    
    return jsonify(result), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required
def get_current_user(current_user):
    """
    Get current user info endpoint
    ---
    tags:
      - Authentication
    security:
      - Bearer: []
    responses:
      200:
        description: User info retrieved successfully
      401:
        description: Unauthorized
    """
    # Get user permissions
    permissions = AuthService.get_user_permissions(current_user['user_id'])
    
    # Add permissions to user info
    user_info = current_user.copy()
    user_info['permissions'] = permissions
    
    return jsonify(user_info), 200