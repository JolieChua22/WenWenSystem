const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 3000;

// Define allowed sort fields to prevent SQL injection
const allowedSortFields = [
  'StudentID',
  'FirstName',
  'LastName',
  'DateOfBirth',
  'Gender',
  'ContactNumber',
  'Email',
  'Address',
  'EnrollmentDate',
  'EmergencyContact'
];
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
  password: 'admin', 
  database: 'tuition'     
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

//Modify from here
// Route to fetch student details

// Route to fetch student details with optional global search and sorting
app.get('/students', (req, res) => {
  console.log('Fetching students...');
  const queryTerm = req.query.query;
  const sortField = req.query.sortField;
  const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC'; // Default to ASC

  let query = 'SELECT * FROM Students';
  let params = [];

  if (queryTerm) {
    // Define all fields to search across
    const searchFields = [
      'StudentID',
      'FirstName',
      'LastName',
      'DateOfBirth',
      'Gender',
      'ContactNumber',
      'Email',
      'Address',
      'EnrollmentDate',
      'EmergencyContact'
    ];

    // Construct the WHERE clause with OR conditions for each field
    const searchConditions = searchFields.map(field => {
      if (['StudentID'].includes(field)) {
        // Cast numeric fields to CHAR for LIKE comparison
        return `CAST(${field} AS CHAR) LIKE ?`;
      } else if (['DateOfBirth', 'EnrollmentDate'].includes(field)) {
        // Format date fields as strings
        return `DATE_FORMAT(${field}, '%Y-%m-%d') LIKE ?`;
      } else {
        // For string fields
        return `${field} LIKE ?`;
      }
    }).join(' OR ');

    query += ` WHERE ${searchConditions}`;

    // Prepare the search pattern for each field
    const searchPattern = `%${queryTerm}%`;
    params = Array(searchFields.length).fill(searchPattern);
  }

  // Handle sorting if sortField is provided and valid
  if (sortField && allowedSortFields.includes(sortField)) {
    query += ` ORDER BY ${sortField} ${sortOrder}`;
  }

  console.log('Executing Query:', query);
  console.log('With Parameters:', params);

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching students:', err.stack);
      return res.status(500).send({ error: 'Database error' });
    }
    console.log('Number of Records Found:', results.length);
    res.json(results);
  });
});
//modify until here

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
