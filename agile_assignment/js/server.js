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

//Modify from here
// Route to handle form submission
// app.post('/submit', (req, res) => {
//   const { name, email } = req.body;

//   const query = 'INSERT INTO users (name, email) VALUES (?, ?)';
//   db.query(query, [name, email], (err, results) => {
//     if (err) {
//       console.error('Error inserting data:', err.stack);
//       res.status(500).json({ message: 'Internal server error' });
//       return;
//     }

//     res.status(200).json({ message: 'Data inserted successfully' });
//   });
// });


// Route to fetch student details
// Route to fetch student details with optional global search
// Route to fetch student details with optional global search
// Route to fetch student details with optional global search
app.get('/students', (req, res) => {
  console.log('Fetching students...');
  const queryTerm = req.query.query;
  let query = 'SELECT * FROM Students';
  let params = [];

  if (queryTerm) {
    // Define the fields to search across (excluding StudentID)
    const searchFields = ['FirstName', 'LastName', 'Email'];

    // Construct the WHERE clause with OR conditions for each field
    const searchConditions = searchFields.map(field => `LOWER(${field}) LIKE LOWER(?)`).join(' OR ');
    query += ` WHERE ${searchConditions}`;

    // Prepare the search pattern for each field
    const searchPattern = `%${queryTerm}%`;
    params = Array(searchFields.length).fill(searchPattern);
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
