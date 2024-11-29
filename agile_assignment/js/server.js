const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors({
  origin: '*', // Allow all origins (you can restrict this to specific origins if needed)
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
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

// Route to handle subject creation
app.post('/createSubject', (req, res) => {
  const { subjectName, description, level } = req.body;

  // Validate required fields
  if (!subjectName || !description || !level) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // Check if subject name already exists
  const checkQuery = 'SELECT * FROM subjects WHERE subjectName = ?';
  db.query(checkQuery, [subjectName], (err, results) => {
    if (err) {
      console.error('Error checking subject name:', err.stack);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    if (results.length > 0) {
      return res.status(409).json({ message: 'Subject name already exists.' }); // HTTP 409 Conflict
    }

    // If no duplicate, insert the new subject
    const insertQuery = 'INSERT INTO subjects (subjectName, description, level) VALUES (?, ?, ?)';
    db.query(insertQuery, [subjectName, description, level], (err, results) => {
      if (err) {
        console.error('Error inserting data:', err.stack);
        return res.status(500).json({ message: 'Internal server error.' });
      }

      res.status(200).json({ message: 'Subject created successfully!' });
    });
  });
});

// Route to fetch all subjects
app.get('/subjects', (req, res) => {
  const query = 'SELECT * FROM subjects';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching subjects:', err.stack);
      return res.status(500).json({ error: 'Database query failed' });
    }
    res.json(results);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
