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

// Route to handle form submission
app.post('/submit', (req, res) => {
  const { name, email } = req.body;

  const query = 'INSERT INTO users (name, email) VALUES (?, ?)';
  db.query(query, [name, email], (err, results) => {
    if (err) {
      console.error('Error inserting data:', err.stack);
      res.status(500).json({ message: 'Internal server error' });
      return;
    }

    res.status(200).json({ message: 'Data inserted successfully' });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
