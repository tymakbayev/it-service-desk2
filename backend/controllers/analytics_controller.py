from flask import Blueprint, request, jsonify, send_file
from services.analytics_service import AnalyticsService
from utils.jwt_util import jwt_required
from datetime import datetime, timedelta
import io

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

@analytics_bp.route('/dashboard', methods=['GET'])
@jwt_required
def get_dashboard_data(current_user):
    """
    Get dashboard analytics data
    ---
    tags:
      - Analytics
    security:
      - Bearer: []
    parameters:
      - in: query
        name: period
        type: string
        enum: [day, week, month, year]
        default: week
    responses:
      200:
        description: Dashboard data retrieved successfully
      401:
        description: Unauthorized
      403:
        description: Forbidden - insufficient permissions
    """
    # Check permissions
    permissions = current_user.get('permissions', [])
    if 'view_dashboard' not in permissions:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    # Get period from query parameters (default to week)
    period = request.args.get('period', 'week')
    
    # Calculate date range based on period
    end_date = datetime.utcnow()
    if period == 'day':
        start_date = end_date - timedelta(days=1)
    elif period == 'week':
        start_date = end_date - timedelta(weeks=1)
    elif period == 'month':
        start_date = end_date - timedelta(days=30)
    elif period == 'year':
        start_date = end_date - timedelta(days=365)
    else:
        start_date = end_date - timedelta(weeks=1)
    
    # Get dashboard data
    dashboard_data = AnalyticsService.get_dashboard_data(
        start_date=start_date,
        end_date=end_date,
        user_id=current_user['user_id'],
        role=current_user['role']
    )
    
    return jsonify(dashboard_data), 200

@analytics_bp.route('/incidents', methods=['GET'])
@jwt_required
def get_incidents_analytics(current_user):
    """
    Get incidents analytics data
    ---
    tags:
      - Analytics
    security:
      - Bearer: []
    parameters:
      - in: query
        name: start_date
        type: string
        format: date
        description: Start date (YYYY-MM-DD)
      - in: query
        name: end_date
        type: string
        format: date
        description: End date (YYYY-MM-DD)
      - in: query
        name: group_by
        type: string
        enum: [status, priority, category, technician, day, week, month]
        default: status
    responses:
      200:
        description: Incidents analytics data retrieved successfully
      401:
        description: Unauthorized
      403:
        description: Forbidden - insufficient permissions
    """
    # Check permissions
    permissions = current_user.get('permissions', [])
    if 'view_analytics' not in permissions and 'view_reports' not in permissions:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    # Get query parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    group_by = request.args.get('group_by', 'status')
    
    # Parse dates if provided
    if start_date:
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
    else:
        start_date = datetime.utcnow() - timedelta(days=30)
    
    if end_date:
        try:
            end_date = datetime.strptime(end_date, '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
    else:
        end_date = datetime.utcnow()
    
    # Get incidents analytics data
    incidents_data = AnalyticsService.get_incidents_analytics(
        start_date=start_date,
        end_date=end_date,
        group_by=group_by,
        user_id=current_user['user_id'],
        role=current_user['role']
    )
    
    return jsonify(incidents_data), 200

@analytics_bp.route('/equipment', methods=['GET'])
@jwt_required
def get_equipment_analytics(current_user):
    """
    Get equipment analytics data
    ---
    tags:
      - Analytics
    security:
      - Bearer: []
    parameters:
      - in: query
        name: group_by
        type: string
        enum: [type, status, department, age]
        default: type
    responses:
      200:
        description: Equipment analytics data retrieved successfully
      401:
        description: Unauthorized
      403:
        description: Forbidden - insufficient permissions
    """
    # Check permissions
    permissions = current_user.get('permissions', [])
    if 'view_analytics' not in permissions and 'view_reports' not in permissions:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    # Get group_by parameter (default to type)
    group_by = request.args.get('group_by', 'type')
    
    # Get equipment analytics data
    equipment_data = AnalyticsService.get_equipment_analytics(
        group_by=group_by,
        user_id=current_user['user_id'],
        role=current_user['role']
    )
    
    return jsonify(equipment_data), 200

@analytics_bp.route('/reports/<report_type>', methods=['GET'])
@jwt_required
def generate_report(current_user, report_type):
    """
    Generate and download reports
    ---
    tags:
      - Analytics
    security:
      - Bearer: []
    parameters:
      - in: path
        name: report_type
        type: string
        required: true
        enum: [incidents, equipment, performance, summary]
      - in: query
        name: format
        type: string
        enum: [pdf, csv, excel]
        default: pdf
      - in: query
        name: start_date
        type: string
        format: date
        description: Start date (YYYY-MM-DD)
      - in: query
        name: end_date
        type: string
        format: date
        description: End date (YYYY-MM-DD)
    responses:
      200:
        description: Report generated successfully
      400:
        description: Invalid parameters
      401:
        description: Unauthorized
      403:
        description: Forbidden - insufficient permissions
    """
    # Check permissions
    permissions = current_user.get('permissions', [])
    if 'generate_reports' not in permissions and 'view_reports' not in permissions:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    # Validate report type
    valid_report_types = ['incidents', 'equipment', 'performance', 'summary']
    if report_type not in valid_report_types:
        return jsonify({'error': f'Invalid report type. Must be one of: {valid_report_types}'}), 400
    
    # Get query parameters
    report_format = request.args.get('format', 'pdf')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Validate format
    valid_formats = ['pdf', 'csv', 'excel']
    if report_format not in valid_formats:
        return jsonify({'error': f'Invalid format. Must be one of: {valid_formats}'}), 400
    
    # Parse dates if provided
    if start_date:
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
    else:
        start_date = datetime.utcnow() - timedelta(days=30)
    
    if end_date:
        try:
            end_date = datetime.strptime(end_date, '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
    else:
        end_date = datetime.utcnow()
    
    # Generate report
    report_data, filename, mime_type = AnalyticsService.generate_report(
        report_type=report_type,
        report_format=report_format,
        start_date=start_date,
        end_date=end_date,
        user_id=current_user['user_id'],
        role=current_user['role']
    )
    
    # Return file for download
    return send_file(
        io.BytesIO(report_data),
        mimetype=mime_type,
        as_attachment=True,
        attachment_filename=filename
    )