from flask import Blueprint, request, jsonify
from utils.jwt_util import jwt_required, get_current_user
from services.equipment_service import EquipmentService
from services.auth_service import AuthService
from utils.role_required import role_required

equipment_bp = Blueprint('equipment', __name__)

class EquipmentController:
    def __init__(self, equipment_service: EquipmentService, auth_service: AuthService):
        self.equipment_service = equipment_service
        self.auth_service = auth_service
        self._register_routes()
    
    def _register_routes(self):
        equipment_bp.route('/', methods=['GET'])(self.get_all_equipment)
        equipment_bp.route('/<int:equipment_id>', methods=['GET'])(self.get_equipment)
        equipment_bp.route('/', methods=['POST'])(self.create_equipment)
        equipment_bp.route('/<int:equipment_id>', methods=['PUT'])(self.update_equipment)
        equipment_bp.route('/<int:equipment_id>/assign', methods=['PATCH'])(self.assign_equipment)
        equipment_bp.route('/<int:equipment_id>/defective', methods=['PATCH'])(self.mark_as_defective)
    
    @jwt_required
    def get_all_equipment(self):
        """
        Get all equipment with optional filtering
        ---
        tags:
          - Equipment
        parameters:
          - name: status
            in: query
            type: string
            required: false
            description: Filter by equipment status
          - name: type
            in: query
            type: string
            required: false
            description: Filter by equipment type
          - name: assigned_to
            in: query
            type: integer
            required: false
            description: Filter by assigned user ID
          - name: search
            in: query
            type: string
            required: false
            description: Search term for equipment name or serial number
        responses:
          200:
            description: List of equipment
        """
        filters = {}
        for param in ['status', 'type', 'assigned_to', 'search']:
            if request.args.get(param):
                filters[param] = request.args.get(param)
        
        try:
            equipment_list = self.equipment_service.get_all_equipment(filters)
            return jsonify({
                'status': 'success',
                'data': equipment_list,
                'count': len(equipment_list)
            }), 200
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 500
    
    @jwt_required
    def get_equipment(self, equipment_id):
        """
        Get equipment by ID
        ---
        tags:
          - Equipment
        parameters:
          - name: equipment_id
            in: path
            type: integer
            required: true
            description: ID of the equipment to retrieve
        responses:
          200:
            description: Equipment details
          404:
            description: Equipment not found
        """
        try:
            equipment = self.equipment_service.get_equipment(equipment_id)
            return jsonify({
                'status': 'success',
                'data': equipment
            }), 200
        except ValueError as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 404
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 500
    
    @jwt_required
    @role_required(['admin', 'technician'])
    def create_equipment(self):
        """
        Create new equipment
        ---
        tags:
          - Equipment
        parameters:
          - name: body
            in: body
            required: true
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: Equipment name
                type:
                  type: string
                  description: Equipment type
                serial_number:
                  type: string
                  description: Serial number
                purchase_date:
                  type: string
                  format: date
                  description: Purchase date (YYYY-MM-DD)
                status:
                  type: string
                  description: Equipment status
                notes:
                  type: string
                  description: Additional notes
        responses:
          201:
            description: Equipment created successfully
          400:
            description: Invalid input data
        """
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'type', 'serial_number']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'status': 'error',
                    'message': f'Missing required field: {field}'
                }), 400
        
        try:
            equipment_id = self.equipment_service.add_equipment(data)
            return jsonify({
                'status': 'success',
                'message': 'Equipment created successfully',
                'equipment_id': equipment_id
            }), 201
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 500
    
    @jwt_required
    @role_required(['admin', 'technician'])
    def update_equipment(self, equipment_id):
        """
        Update equipment
        ---
        tags:
          - Equipment
        parameters:
          - name: equipment_id
            in: path
            type: integer
            required: true
            description: ID of the equipment to update
          - name: body
            in: body
            required: true
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: Equipment name
                type:
                  type: string
                  description: Equipment type
                serial_number:
                  type: string
                  description: Serial number
                purchase_date:
                  type: string
                  format: date
                  description: Purchase date (YYYY-MM-DD)
                status:
                  type: string
                  description: Equipment status
                notes:
                  type: string
                  description: Additional notes
        responses:
          200:
            description: Equipment updated successfully
          404:
            description: Equipment not found
        """
        data = request.get_json()
        
        try:
            updated_equipment = self.equipment_service.update_equipment(equipment_id, data)
            return jsonify({
                'status': 'success',
                'message': 'Equipment updated successfully',
                'data': updated_equipment
            }), 200
        except ValueError as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 404
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 500
    
    @jwt_required
    @role_required(['admin', 'technician'])
    def assign_equipment(self, equipment_id):
        """
        Assign equipment to a user
        ---
        tags:
          - Equipment
        parameters:
          - name: equipment_id
            in: path
            type: integer
            required: true
            description: ID of the equipment to assign
          - name: body
            in: body
            required: true
            schema:
              type: object
              properties:
                user_id:
                  type: integer
                  description: ID of the user to assign equipment to
        responses:
          200:
            description: Equipment assigned successfully
          404:
            description: Equipment or user not found
        """
        data = request.get_json()
        
        if 'user_id' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Missing required field: user_id'
            }), 400
        
        try:
            updated_equipment = self.equipment_service.assign_equipment(equipment_id, data['user_id'])
            return jsonify({
                'status': 'success',
                'message': 'Equipment assigned successfully',
                'data': updated_equipment
            }), 200
        except ValueError as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 404
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 500
    
    @jwt_required
    def mark_as_defective(self, equipment_id):
        """
        Mark equipment as defective
        ---
        tags:
          - Equipment
        parameters:
          - name: equipment_id
            in: path
            type: integer
            required: true
            description: ID of the equipment to mark as defective
          - name: body
            in: body
            required: true
            schema:
              type: object
              properties:
                reason:
                  type: string
                  description: Reason for marking as defective
        responses:
          200:
            description: Equipment marked as defective successfully
          404:
            description: Equipment not found
        """
        data = request.get_json()
        
        if 'reason' not in data or not data['reason']:
            return jsonify({
                'status': 'error',
                'message': 'Missing required field: reason'
            }), 400
        
        try:
            updated_equipment = self.equipment_service.mark_as_defective(equipment_id, data['reason'])
            return jsonify({
                'status': 'success',
                'message': 'Equipment marked as defective',
                'data': updated_equipment
            }), 200
        except ValueError as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 404
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 500
