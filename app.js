// ==================== CONFIGURATION ====================
const API_BASE_URL = 'http://127.0.0.1:5000/api';
let currentUser = null;
let currentTheme = localStorage.getItem('theme') || 'light';

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    checkAuth();
    setupEventListeners();
});

// ==================== THEME MANAGEMENT ====================
function initializeTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const themeIcon = document.querySelector('.theme-icon');
    themeIcon.textContent = currentTheme === 'light' ? '🌙' : '☀️';
}

// ==================== AUTHENTICATION ====================
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        currentUser = JSON.parse(user);
        showDashboard();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainDashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainDashboard').style.display = 'flex';
    
    // Update user info in header
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
    
    // Load appropriate dashboard
    if (currentUser.role === 'student') {
        loadStudentDashboard();
    } else if (currentUser.role === 'mentor') {
        loadMentorDashboard();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            showDashboard();
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Connection error. Please ensure the backend server is running.');
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    showLogin();
}

// ==================== STUDENT DASHBOARD ====================
async function loadStudentDashboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/student/dashboard/${currentUser.id}`);
        const data = await response.json();
        
        if (response.ok) {
            renderStudentDashboard(data);
        } else {
            console.error('Failed to load dashboard:', data.message);
        }
    } catch (error) {
        console.error('Dashboard error:', error);
        // Load demo data for testing
        loadDemoStudentData();
    }
}

function renderStudentDashboard(data) {
    // Update stats
    document.getElementById('attendancePercent').textContent = `${data.attendance.percentage}%`;
    document.getElementById('pendingAssignments').textContent = 
        data.assignments.filter(a => a.status === 'pending').length;
    document.getElementById('upcomingExams').textContent = 
        data.exams.filter(e => !e.marks_obtained).length;
    document.getElementById('totalBacklogs').textContent = data.backlogs.length;
    
    // Update risk score
    const riskScore = data.risk.risk_score;
    const riskLevel = data.risk.risk_level;
    
    document.getElementById('riskScoreValue').textContent = Math.round(riskScore);
    
    const riskCircle = document.getElementById('riskScoreCircle');
    riskCircle.className = `risk-score-circle ${riskLevel}`;
    
    const riskBadge = document.querySelector('.risk-badge');
    riskBadge.textContent = `${riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk`;
    riskBadge.className = `risk-badge ${riskLevel}`;
    
    // Update risk factors
    document.getElementById('factorAttendance').textContent = `${data.risk.factors.attendance}%`;
    document.getElementById('factorAssignments').textContent = `${data.risk.factors.assignments}%`;
    document.getElementById('factorExams').textContent = `${data.risk.factors.exams}%`;
    document.getElementById('factorBacklogs').textContent = data.risk.factors.backlogs;
    
    // Render alerts
    renderAlerts(data.alerts);
    
    // Render upcoming deadlines
    renderDeadlines(data.assignments);
}

function renderAlerts(alerts) {
    const container = document.getElementById('alertsContainer');
    container.innerHTML = '';
    
    alerts.forEach(alert => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${alert.type}`;
        alertDiv.textContent = alert.message;
        container.appendChild(alertDiv);
    });
}

function renderDeadlines(assignments) {
    const container = document.getElementById('upcomingDeadlines');
    container.innerHTML = '';
    
    const upcoming = assignments
        .filter(a => a.status === 'pending')
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 5);
    
    if (upcoming.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No upcoming deadlines</p>';
        return;
    }
    
    upcoming.forEach(assignment => {
        const daysLeft = Math.ceil((new Date(assignment.due_date) - new Date()) / (1000 * 60 * 60 * 24));
        
        const item = document.createElement('div');
        item.className = 'deadline-item';
        item.innerHTML = `
            <div class="deadline-info">
                <h4>${assignment.title}</h4>
                <p>${assignment.description || 'No description'}</p>
            </div>
            <div class="deadline-date">
                <div class="days">${daysLeft}</div>
                <div class="label">days left</div>
            </div>
        `;
        container.appendChild(item);
    });
}

// ==================== MENTOR DASHBOARD ====================
async function loadMentorDashboard() {
    // Hide student dashboard, show mentor dashboard
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('mentorDashboardView').style.display = 'block';
    document.getElementById('mentorDashboardView').classList.add('active');
    
    try {
        const response = await fetch(`${API_BASE_URL}/mentor/students/${currentUser.id}`);
        const data = await response.json();
        
        if (response.ok) {
            renderMentorDashboard(data.students);
        } else {
            console.error('Failed to load students:', data.message);
        }
    } catch (error) {
        console.error('Mentor dashboard error:', error);
        loadDemoMentorData();
    }
}

function renderMentorDashboard(students) {
    const container = document.getElementById('studentsGrid');
    container.innerHTML = '';
    
    students.forEach(student => {
        const card = document.createElement('div');
        card.className = `student-card ${student.risk_level}`;
        card.innerHTML = `
            <div class="student-header">
                <div class="student-avatar">${student.name.charAt(0)}</div>
                <div class="student-info">
                    <h3>${student.name}</h3>
                    <p>${student.roll_number}</p>
                </div>
            </div>
            <div class="student-stats">
                <div class="student-stat">
                    <div class="value">${student.risk_score}</div>
                    <div class="label">Risk Score</div>
                </div>
                <div class="student-stat">
                    <div class="value">${student.factors.attendance}%</div>
                    <div class="label">Attendance</div>
                </div>
                <div class="student-stat">
                    <div class="value">${student.factors.assignments}%</div>
                    <div class="label">Assignments</div>
                </div>
                <div class="student-stat">
                    <div class="value">${student.factors.backlogs}</div>
                    <div class="label">Backlogs</div>
                </div>
            </div>
            <div class="risk-badge ${student.risk_level}">
                ${student.risk_level.charAt(0).toUpperCase() + student.risk_level.slice(1)} Risk
            </div>
        `;
        
        card.addEventListener('click', () => viewStudentDetails(student.id));
        container.appendChild(card);
    });
}

async function viewStudentDetails(studentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/mentor/student/${studentId}/details`);
        const data = await response.json();
        
        if (response.ok) {
            // Show detailed modal or navigate to detail view
            alert(`Viewing details for ${data.student.name}\nRisk Score: ${data.risk.risk_score}\nAttendance: ${data.attendance.percentage}%`);
        }
    } catch (error) {
        console.error('Error loading student details:', error);
    }
}

// ==================== NAVIGATION ====================
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            switchView(view);
        });
    });
    
    // Risk filter for mentor dashboard
    const riskFilter = document.getElementById('riskFilter');
    if (riskFilter) {
        riskFilter.addEventListener('change', (e) => {
            filterStudentsByRisk(e.target.value);
        });
    }
}

function switchView(viewName) {
    // Update navigation active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
    
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
        view.style.display = 'none';
    });
    
    // Show selected view
    const viewMap = {
        'dashboard': currentUser.role === 'mentor' ? 'mentorDashboardView' : 'dashboardView',
        'attendance': 'attendanceView',
        'assignments': 'assignmentsView',
        'exams': 'examsView',
        'notifications': 'notificationsView'
    };
    
    const targetView = document.getElementById(viewMap[viewName]);
    if (targetView) {
        targetView.style.display = 'block';
        targetView.classList.add('active');
    }
    
    // Update page title
    document.getElementById('pageTitle').textContent = 
        viewName.charAt(0).toUpperCase() + viewName.slice(1);
}

function filterStudentsByRisk(level) {
    const cards = document.querySelectorAll('.student-card');
    cards.forEach(card => {
        if (level === 'all' || card.classList.contains(level)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ==================== DEMO DATA (for testing without backend) ====================
function loadDemoStudentData() {
    const demoData = {
        student: {
            id: 1,
            name: 'Aarav Patel',
            email: 'aarav.patel@student.edu',
            roll_number: '2024001'
        },
        attendance: {
            percentage: 85.5,
            total_classes: 140,
            attended: 119
        },
        assignments: [
            {
                id: 1,
                title: 'AP Assignment 1',
                description: 'Complete problems from chapter 1',
                due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'pending'
            },
            {
                id: 2,
                title: 'PCE Lab Report',
                description: 'Submit programming lab report',
                due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'pending'
            }
        ],
        exams: [
            { id: 1, course_id: 1, exam_type: 'end-term', marks_obtained: null }
        ],
        backlogs: [],
        risk: {
            risk_score: 78.5,
            risk_level: 'low',
            factors: {
                attendance: 85.5,
                assignments: 80,
                exams: 75,
                backlogs: 0
            }
        },
        alerts: [
            {
                type: 'info',
                message: '📝 Assignment "PCE Lab Report" due in 3 days!'
            }
        ]
    };
    
    renderStudentDashboard(demoData);
}

function loadDemoMentorData() {
    const demoStudents = [
        {
            id: 1,
            name: 'Aarav Patel',
            roll_number: '2024001',
            risk_score: 78,
            risk_level: 'low',
            factors: { attendance: 85, assignments: 80, exams: 75, backlogs: 0 }
        },
        {
            id: 5,
            name: 'Vihaan Gupta',
            roll_number: '2024005',
            risk_score: 45,
            risk_level: 'high',
            factors: { attendance: 60, assignments: 50, exams: 40, backlogs: 2 }
        },
        {
            id: 3,
            name: 'Arjun Singh',
            roll_number: '2024003',
            risk_score: 65,
            risk_level: 'medium',
            factors: { attendance: 75, assignments: 70, exams: 60, backlogs: 0 }
        }
    ];
    
    renderMentorDashboard(demoStudents);
}