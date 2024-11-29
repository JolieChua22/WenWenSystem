const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors({
  origin: '*', // Allow all origins (you can restrict this to specific origins if needed)
  methods: ['GET', 'POST'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
}));

// MySQL connection setup
const db = mysql.createConnection({
  host: 'localhost',
  user: 'agile',
  password: 'admin', // Replace with your MySQL password
  database: 'tuition' // Replace with your database name
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.stack);
    return;
  }
  console.log('Connected to MySQL as id', db.threadId);
});

// Middleware
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Route to fetch teachers for the dropdown in createClasses.html
app.get('/get-teachers', (req, res) => {
  console.log('Fetching teachers...');
  const query = 'SELECT TeacherID, FirstName, LastName, SubjectSpecialization FROM teachers';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching teachers:', err.stack);
      return res.status(500).json({ message: 'Database error' });
    }
    res.status(200).json(results); // Return teacher details
  });
});

// Route to fetch subjects for the dropdown in createClasses.html
app.get('/get-subjects', (req, res) => {
  console.log('Fetching subjects...');
  const query = 'SELECT SubjectID, SubjectName FROM subjects';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching subjects:', err.stack);
      return res.status(500).json({ message: 'Database error' });
    }
    res.status(200).json(results); // Return subject details
  });
});


// Route to handle class creation from createClasses.html
app.post('/create-class', (req, res) => {
  const { className, subject, teacherId, day, startTime, endTime, roomNumber } = req.body;

  // Validate inputs
  if (!className || !subject || !teacherId || !day || !startTime || !endTime || !roomNumber) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const query = `
    INSERT INTO classes (ClassName, Subject, TeacherID, Day, StartTime, EndTime, RoomNumber)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(query, [className, subject, teacherId, day, startTime, endTime, roomNumber], (err, results) => {
    if (err) {
      console.error('Error inserting class:', err.stack);
      return res.status(500).json({ message: 'Database error' });
    }

    res.status(201).json({ message: 'Class created successfully', classId: results.insertId });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
