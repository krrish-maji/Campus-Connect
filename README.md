# Campus-Connect
Developed a full-stack web-based EdTech platform with role-based authentication, student performance tracking, and institutional analytics using HTML, CSS, JavaScript, Flask, and MySQL. 
We propose an AI-powered Student Success and Retention Platform that centralizes academic data for institutions while helping students organize, prioritize, and track their academic tasks. The platform uses AI-based prioritization and mentor dashboards to enable early intervention and improve student performance and retention. It is built as a web-based system using HTML, CSS, JavaScript, Python (Flask), and a relational database (MySQL).

Model Promises:
  Provides centralized academic management
  Ensures intelligent task prioritization
  Supports mentor-based student monitoring
  Improves engagement and retention

Setup Steps:
1. Copy the codes to your vs code editor
   
2. Should have MySQL, and a database named student-success-platform, [Also, change the password as per your MySQL client server].
   
3. intall required extensions, HTML, CSS, JS, live server, etc.
   
   
4. Create virual environment 
  python -m venv venv
  venv\Scripts\activate

5. Install all the Dependencies : {Really Important}
  pip install flask flask-cors mysql-connector-python PyJWT google-api-python-client google-auth-httplib2 google-auth-oauthlib

6. Save Backend Code:
   Save the Flask code as app.py in your project directory.
   
7. Save Frontend Files
  Save index.html in static/ folder
  Save style.css in static/ folder
  Save app.js in static/ folder

8. Correct Content Sturcture is:
   student-success-platform/          ← Main project folder
│
├── app_with_cors.py                         ← Flask backend
├── landing-page
    ├── landing.html            ← Rename from index.html
    ├── page.css
    └── app.js                  ← Your landing page (keep it here)
    │
    └── static/                        ← Static folder (keep it here)
    ├── login.html                 ← Login page (RENAME from index.html)
    ├── style.css                  ← Login page styles
    └── app.js                     ← Login page JavaScript
   
10. Start Backend Server: (in virtual mode)
    Navigate to project directory i.e. student-success-platform
   activate venv : venv\Scripts\activate
   Run : python app_with_cors.py
   
11. Start Frontend:
    Install "Live Server" extension in VS Code
    Right-click login.html
    Select "Open with Live Server"
    
12. Access the Application (Optional) :
  Frontend: http://localhost:8000
  Backend API: http://localhost:5000/api
  API Health Check: http://localhost:5000/api/health

13. Testing:
Test Credentials
Students:

Email: aarav.patel@student.edu
Password: student123
Roll: 2024001

Mentors:

Email: rajesh.kumar@college.edu
Password: mentor123
