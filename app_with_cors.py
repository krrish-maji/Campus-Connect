from flask import Flask, request, jsonify, make_response, send_from_directory
from flask_cors import CORS
from datetime import datetime, timedelta
import mysql.connector
from mysql.connector import Error
import hashlib
import jwt
from functools import wraps
import os

app = Flask(__name__, static_folder='static', static_url_path='')

# Enhanced CORS configuration
CORS(app, resources={r"/api/*": {"origins": "*"}})

app.config['SECRET_KEY'] = 'your-secret-key-change-this'

# Add CORS headers to every response
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Serve landing page
@app.route('/')
def landing():
    return send_from_directory('.', 'landing.html')

# Serve login page
@app.route('/login')
def login_page():
    return send_from_directory('static', 'login.html')

# Database Configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'system',  # UPDATE THIS
    'database': 'student_success_platform'
}

def get_db_connection():
    """Create database connection"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def calculate_risk_score(student_id):
    """Calculate risk score based on weighted factors"""
    conn = get_db_connection()
    if not conn:
        return None
    
    cursor = conn.cursor(dictionary=True)
    
    # Get attendance percentage
    cursor.execute("""
        SELECT AVG(status = 'present') * 100 as attendance_pct
        FROM attendance
        WHERE student_id = %s
    """, (student_id,))
    attendance_result = cursor.fetchone()
    attendance_pct = attendance_result['attendance_pct'] or 0
    
    # Get assignment completion rate
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted
        FROM assignments
        WHERE student_id = %s
    """, (student_id,))
    assignment_result = cursor.fetchone()
    assignment_pct = (assignment_result['submitted'] / assignment_result['total'] * 100) if assignment_result['total'] > 0 else 0
    
    # Get exam performance (average marks)
    cursor.execute("""
        SELECT AVG(marks_obtained / total_marks * 100) as exam_pct
        FROM exams
        WHERE student_id = %s
    """, (student_id,))
    exam_result = cursor.fetchone()
    exam_pct = exam_result['exam_pct'] or 0
    
    # Get backlogs count
    cursor.execute("""
        SELECT COUNT(*) as backlog_count
        FROM backlogs
        WHERE student_id = %s AND status = 'pending'
    """, (student_id,))
    backlog_result = cursor.fetchone()
    backlog_count = backlog_result['backlog_count']
    
    # Calculate backlog score (inverse - more backlogs = lower score)
    backlog_pct = max(0, 100 - (backlog_count * 25))
    
    # Weighted risk score calculation
    risk_score = (
        (exam_pct * 0.30) +
        (backlog_pct * 0.30) +
        (attendance_pct * 0.20) +
        (assignment_pct * 0.20)
    )
    
    # Determine risk level
    if risk_score >= 75:
        risk_level = 'low'
    elif risk_score >= 50:
        risk_level = 'medium'
    else:
        risk_level = 'high'
    
    cursor.close()
    conn.close()
    
    return {
        'risk_score': round(risk_score, 2),
        'risk_level': risk_level,
        'factors': {
            'attendance': round(attendance_pct, 2),
            'assignments': round(assignment_pct, 2),
            'exams': round(exam_pct, 2),
            'backlogs': backlog_count
        }
    }

@app.route('/api/login', methods=['POST', 'OPTIONS'])
def login():
    """User login endpoint"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'message': 'Email and password required'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Check in students table
        cursor.execute("SELECT * FROM students WHERE email = %s", (email,))
        user = cursor.fetchone()
        role = 'student'
        
        # If not found, check in mentors table
        if not user:
            cursor.execute("SELECT * FROM mentors WHERE email = %s", (email,))
            user = cursor.fetchone()
            role = 'mentor'
        
        cursor.close()
        conn.close()
        
        if not user:
            return jsonify({'message': 'Invalid credentials'}), 401
        
        # Verify password
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        
        if user['password'] != hashed_password:
            return jsonify({'message': 'Invalid credentials'}), 401
        
        # Generate JWT token
        token = jwt.encode({
            'user_id': user['id'],
            'role': role,
            'exp': datetime.utcnow() + timedelta(days=7)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        
        if isinstance(token, bytes):
            token = token.decode('utf-8')
        
        return jsonify({
            'token': token,
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'role': role
            }
        }), 200
        
    except Exception as e:
        print(f"Login Error: {e}")
        return jsonify({'message': f'Server error: {str(e)}'}), 500

@app.route('/api/student/dashboard/<int:student_id>', methods=['GET', 'OPTIONS'])
def get_student_dashboard(student_id):
    """Get complete student dashboard data"""
    if request.method == 'OPTIONS':
        return '', 200
        
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    
    # Get student info
    cursor.execute("SELECT * FROM students WHERE id = %s", (student_id,))
    student = cursor.fetchone()
    
    if not student:
        cursor.close()
        conn.close()
        return jsonify({'message': 'Student not found'}), 404
    
    # Get attendance
    cursor.execute("""
        SELECT 
            AVG(status = 'present') * 100 as attendance_percentage,
            COUNT(*) as total_classes,
            SUM(status = 'present') as attended_classes
        FROM attendance
        WHERE student_id = %s
    """, (student_id,))
    attendance = cursor.fetchone()
    
    # Get upcoming assignments
    cursor.execute("""
        SELECT * FROM assignments
        WHERE student_id = %s AND due_date >= CURDATE()
        ORDER BY due_date ASC
        LIMIT 5
    """, (student_id,))
    assignments = cursor.fetchall()
    
    # Get recent exams
    cursor.execute("""
        SELECT * FROM exams
        WHERE student_id = %s
        ORDER BY exam_date DESC
        LIMIT 5
    """, (student_id,))
    exams = cursor.fetchall()
    
    # Get backlogs
    cursor.execute("""
        SELECT * FROM backlogs
        WHERE student_id = %s AND status = 'pending'
    """, (student_id,))
    backlogs = cursor.fetchall()
    
    # Calculate risk score
    risk_data = calculate_risk_score(student_id)
    
    # Get alerts
    alerts = []
    if risk_data['risk_level'] == 'high':
        alerts.append({
            'type': 'danger',
            'message': '⚠️ You are at academic risk! Please contact your mentor.'
        })
    if attendance['attendance_percentage'] < 75:
        alerts.append({
            'type': 'warning',
            'message': f'⚠️ Low attendance: {attendance["attendance_percentage"]:.1f}%'
        })
    
    cursor.close()
    conn.close()
    
    return jsonify({
        'student': {
            'id': student['id'],
            'name': student['name'],
            'email': student['email'],
            'roll_number': student['roll_number']
        },
        'attendance': {
            'percentage': round(attendance['attendance_percentage'], 2),
            'total_classes': attendance['total_classes'],
            'attended': attendance['attended_classes']
        },
        'assignments': assignments,
        'exams': exams,
        'backlogs': backlogs,
        'risk': risk_data,
        'alerts': alerts
    }), 200

@app.route('/api/mentor/students/<int:mentor_id>', methods=['GET', 'OPTIONS'])
def get_mentor_students(mentor_id):
    """Get all students assigned to a mentor with risk indicators"""
    if request.method == 'OPTIONS':
        return '', 200
        
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    
    # Get all students for this mentor
    cursor.execute("""
        SELECT * FROM students
        WHERE mentor_id = %s
        ORDER BY name
    """, (mentor_id,))
    students = cursor.fetchall()
    
    # Calculate risk score for each student
    students_with_risk = []
    for student in students:
        risk_data = calculate_risk_score(student['id'])
        students_with_risk.append({
            'id': student['id'],
            'name': student['name'],
            'roll_number': student['roll_number'],
            'email': student['email'],
            'risk_score': risk_data['risk_score'],
            'risk_level': risk_data['risk_level'],
            'factors': risk_data['factors']
        })
    
    cursor.close()
    conn.close()
    
    return jsonify({'students': students_with_risk}), 200

@app.route('/api/health', methods=['GET'])
def health_check():
    """API health check"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    }), 200

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 Student Success Platform - CORS Fixed Version")
    print("="*60)
    print("Server: http://127.0.0.1:5000")
    print("Health: http://127.0.0.1:5000/api/health")
    print("="*60 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)