from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError

from ..services.incident_service import IncidentService
from ..services.auth_service import AuthService
from ..schemas.incident_schema import IncidentSchema, IncidentUpdateSchema, IncidentStatusSchema, IncidentAssignSchema
from ..utils.role_required import role_required

incident_bp = Blueprint('incidents', __name__, url_prefix='/api/incidents')
incident_service = IncidentService()
auth_service = AuthService()

@incident_bp.route('', methods=['GET'])
@jwt_required()
def get_incidents():
    """Get all incidents with optional filtering"""
    user_id = get_jwt_identity()
    user = auth_service.get_user_by_id(user_id)
    
    # Parse query parameters for filtering
    status = request.args.get('status')
    priority = request.args.get('priority')
    assigned_to = request.args.get('assigned_to')
    equipment_id = request.args.get('equipment_id')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    
    # Apply role-based filtering
    if user['role'] == 'user':
        # Regular users can only see their own incidents
        incidents = incident_service.get_incidents(created_by=user_id, status=status, 
                                                priority=priority, assigned_to=assigned_to,
                                                equipment_id=equipment_id, date_from=date_from,
                                                date_to=date_to)
    else:
        # Technicians and admins can see all incidents
        incidents = incident_service.get_incidents(status=status, priority=priority,
                                                assigned_to=assigned_to, equipment_id=equipment_id,
                                                date_from=date_from, date_to=date_to)
    
    return jsonify({
        'success': True,
        'data': incidents
    }), 200

@incident_bp.route('/<int:incident_id>', methods=['GET'])
@jwt_required()
def get_incident(incident_id):
    """Get a specific incident by ID"""
    user_id = get_jwt_identity()
    user = auth_service.get_user_by_id(user_id)
    
    incident = incident_service.get_incident_by_id(incident_id)
    
    if not incident:
        return jsonify({
            'success': False,
            'message': 'Incident not found'
        }), 404
    
    # Check if user has permission to view this incident
    if user['role'] == 'user' and incident['created_by'] != user_id:
        return jsonify({
            'success': False,
            'message': 'You do not have permission to view this incident'
        }), 403
    
    return jsonify({
        'success': True,
        'data': incident
    }), 200

@incident_bp.route('', methods=['POST'])
@jwt_required()
def create_incident():
    """Create a new incident"""
    user_id = get_jwt_identity()
    
    try:
        incident_data = IncidentSchema().load(request.json)
    except ValidationError as err:
        return jsonify({
            'success': False,
            'message': 'Validation error',
            'errors': err.messages
        }), 400
    
    # Set the creator of the incident
    incident_data['created_by'] = user_id
    
    # Create the incident
    new_incident = incident_service.create_incident(incident_data)
    
    return jsonify({
        'success': True,
        'message': 'Incident created successfully',
        'data': new_incident
    }), 201

@incident_bp.route('/<int:incident_id>', methods=['PUT'])
@jwt_required()
def update_incident(incident_id):
    """Update an existing incident"""
    user_id = get_jwt_identity()
    user = auth_service.get_user_by_id(user_id)
    
    incident = incident_service.get_incident_by_id(incident_id)
    if not incident:
        return jsonify({
            'success': False,
            'message': 'Incident not found'
        }), 404
    
    # Check if user has permission to update this incident
    if user['role'] == 'user' and incident['created_by'] != user_id:
        return jsonify({
            'success': False,
            'message': 'You do not have permission to update this incident'
        }), 403
    
    try:
        incident_data = IncidentUpdateSchema().load(request.json)
    except ValidationError as err:
        return jsonify({
            'success': False,
            'message': 'Validation error',
            'errors': err.messages
        }), 400
    
    # Update the incident
    updated_incident = incident_service.update_incident(incident_id, incident_data)
    
    return jsonify({
        'success': True,
        'message': 'Incident updated successfully',
        'data': updated_incident
    }), 200

@incident_bp.route('/<int:incident_id>/status', methods=['PATCH'])
@jwt_required()
@role_required(['technician', 'admin'])
def update_incident_status(incident_id):
    """Update the status of an incident (technicians and admins only)"""
    user_id = get_jwt_identity()
    
    incident = incident_service.get_incident_by_id(incident_id)
    if not incident:
        return jsonify({
            'success': False,
            'message': 'Incident not found'
        }), 404
    
    try:
        status_data = IncidentStatusSchema().load(request.json)
    except ValidationError as err:
        return jsonify({
            'success': False,
            'message': 'Validation error',
            'errors': err.messages
        }), 400
    
    # Update the incident status
    updated_incident = incident_service.update_incident_status(
        incident_id, 
        status_data['status'],
        status_data.get('resolution_notes'),
        user_id
    )
    
    return jsonify({
        'success': True,
        'message': f'Incident status updated to {status_data["status"]}',
        'data': updated_incident
    }), 200

@incident_bp.route('/<int:incident_id>/assign', methods=['PATCH'])
@jwt_required()
@role_required(['admin'])
def assign_incident(incident_id):
    """Assign an incident to a technician (admin only)"""
    incident = incident_service.get_incident_by_id(incident_id)
    if not incident:
        return jsonify({
            'success': False,
            'message': 'Incident not found'
        }), 404
    
    try:
        assign_data = IncidentAssignSchema().load(request.json)
    except ValidationError as err:
        return jsonify({
            'success': False,
            'message': 'Validation error',
            'errors': err.messages
        }), 400
    
    # Check if the assigned user exists and is a technician
    assigned_user = auth_service.get_user_by_id(assign_data['assigned_to'])
    if not assigned_user:
        return jsonify({
            'success': False,
            'message': 'Assigned user not found'
        }), 404
    
    if assigned_user['role'] != 'technician':
        return jsonify({
            'success': False,
            'message': 'Incidents can only be assigned to technicians'
        }), 400
    
    # Assign the incident
    updated_incident = incident_service.assign_incident(
        incident_id, 
        assign_data['assigned_to']
    )
    
    return jsonify({
        'success': True,
        'message': 'Incident assigned successfully',
        'data': updated_incident
    }), 200
