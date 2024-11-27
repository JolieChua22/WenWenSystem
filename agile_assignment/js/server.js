const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// MySQL connection setup
const db = mysql.createConnection({
  host: 'localhost',
  user: 'agile',
  password: 'admin', // Replace with your MySQL password
  database: 'tuition'     // Replace with your database name
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
const cors = require('cors');

// Enable CORS for all requests
app.use(cors());

//Modify from here

app.post('/submit', (req, res) => {
  const {
    firstName,
    lastName,
    dob,
    gender,
    contact,
    email,
    address,
    enrollmentDate,
    emergencyContact,
  } = req.body;

  const query = `
    INSERT INTO Students (FirstName, LastName, DateOfBirth, Gender, ContactNumber, Email, Address, EnrollmentDate, EmergencyContact)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [firstName, lastName, dob, gender, contact, email, address, enrollmentDate, emergencyContact],
    (err, results) => {
      if (err) {
        console.error('Error inserting data:', err.stack);
        res.status(500).json({ error: 'Failed to add student' });
        return;
      }
      res.status(200).json({ message: 'Student added successfully' });
    }
  );
});

const path = require('path');

// Serve CSS files from the css folder
app.use('/css', express.static(path.join(__dirname, '../css')));

// Serve index.html from the presentation folder
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../presentation', 'addStudent.html'));
});

  
// Serve JS files (including server.js and script.js) from the js folder
app.use('/js', express.static(__dirname)); // Serves files from the same directory as server.js



//modify until here



// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});



