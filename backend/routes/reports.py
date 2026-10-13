from flask import Blueprint, jsonify
from services.report_service import ReportService

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('', methods=['GET'])
def get_reports_catalog():
    """Return catalog of all 18 DBMS reports."""
    catalog = ReportService.get_all_reports_meta()
    return jsonify(catalog)

@reports_bp.route('/<report_key>', methods=['GET'])
def get_report_data(report_key):
    """Execute the specific DBMS SQL report against MySQL."""
    result = ReportService.execute_report(report_key)
    if not result:
        return jsonify({'error': f'Report with key "{report_key}" not found.'}), 404
    return jsonify(result)
