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

//wyman
// Login Route
app.post('/login', (req, res) => {
  const { teacherID, password } = req.body;

  const query = 'SELECT * FROM Teachers WHERE TeacherID = ?';
  db.query(query, [teacherID], (err, results) => {
    if (err) {
      console.error('Error fetching teacher:', err.stack);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid TeacherID or no matching record found in the database.' });
    }

    const teacher = results[0];
    // Assuming plaintext password for simplicity; replace with bcrypt if hashing is used
    if (password === teacher.Password) {
      res.status(200).json({
        message: 'Login successful!',
        teacherID: teacher.TeacherID,
        firstName: teacher.FirstName,
        lastName: teacher.LastName
      });
    } else {
      res.status(401).json({ message: 'Your password is invalid. Please try again.' });
    }
  });
});


app.post("/submit", async (req, res) => {
  try {
    const { firstName, lastName, dob, enrollmentDate, contact } = req.body;

    // Validate contact number (only digits allowed)
    if (!/^\d+$/.test(contact)) {
      return res.status(400).json({ error: "Contact number must contain only digits." });
    }

    // Validate age
    const today = new Date();
    const dobDate = new Date(dob);
    let ageInYears = today.getFullYear() - dobDate.getFullYear();
    const monthDifference = today.getMonth() - dobDate.getMonth();
    const dayDifference = today.getDate() - dobDate.getDate();

    if (monthDifference < 0 || (monthDifference === 0 && dayDifference < 0)) {
      ageInYears--;
    }

    if (ageInYears < 7) {
      return res.status(400).json({ error: "Student must be at least 7 years old." });
    }

    // Validate enrollment date
    const enrollmentDateValue = new Date(enrollmentDate);
    if (enrollmentDateValue < today.setHours(0, 0, 0, 0)) {
      return res.status(400).json({ error: "Enrollment date must be today or a future date." });
    }

    // Check for duplicate student
    const checkQuery = "SELECT * FROM Students WHERE FirstName = ? AND LastName = ? AND DateOfBirth = ?";
    const [existingStudent] = await db.promise().query(checkQuery, [firstName, lastName, dob]);

    if (existingStudent.length > 0) {
      return res.status(400).json({ error: "Student record already exists." });
    }

    // Insert the new student record
    const insertQuery = `
      INSERT INTO Students (FirstName, LastName, DateOfBirth, Gender, ContactNumber, Email, Address, EnrollmentDate, EmergencyContact)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.promise().query(insertQuery, Object.values(req.body));

    res.status(201).json({ message: "Student added successfully!" });
  } catch (err) {
    console.error("Error handling /submit request:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

//sh
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

//ks
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

//xy
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

// Route to handle class creation
app.post('/create-class', (req, res) => {
  const { className, subject, teacherId, day, startTime, endTime, roomNumber } = req.body;

  // Validate required fields
  if (!className || !subject || !teacherId || !day || !startTime || !endTime || !roomNumber) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // Validate time range
  const workingHoursStart = '09:59:00';
  const workingHoursEnd = '22:00:00';

  if (startTime < workingHoursStart || endTime > workingHoursEnd) {
    return res.status(400).json({ message: 'Class time must be within working hours (10:00 AM to 10:00 PM).' });
  }

  if (startTime >= endTime) {
    return res.status(400).json({ message: 'End time must be later than start time.' });
  }

  // Check for class name duplication
  const checkClassQuery = 'SELECT ClassID FROM classes WHERE ClassName = ?';
  db.query(checkClassQuery, [className], (err, classResults) => {
    if (err) {
      console.error('Error checking class name:', err.stack);
      return res.status(500).json({ message: 'Database error while checking class name.' });
    }

    if (classResults.length > 0) {
      return res.status(409).json({ message: 'Class name already exists.' });
    }

    // Check for overlapping classes
    const checkOverlapQuery = `
          SELECT * FROM classes
          WHERE RoomNumber = ? AND Day = ? AND (
              (StartTime < ? AND EndTime > ?) OR 
              (StartTime < ? AND EndTime > ?)
          )
      `;
    db.query(checkOverlapQuery, [roomNumber, day, endTime, startTime, startTime, endTime], (err, overlapResults) => {
      if (err) {
        console.error('Error checking room availability:', err.stack);
        return res.status(500).json({ message: 'Database error while checking room availability.' });
      }

      if (overlapResults.length > 0) {
        return res.status(409).json({ message: 'The room is already booked for the specified time and day.' });
      }

      // Insert the new class
      const insertQuery = `
              INSERT INTO classes (ClassName, Subject, TeacherID, Day, StartTime, EndTime, RoomNumber)
              VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
      db.query(insertQuery, [className, subject, teacherId, day, startTime, endTime, roomNumber], (err, results) => {
        if (err) {
          console.error('Error inserting class:', err.stack);
          return res.status(500).json({ message: 'Database error while creating class.' });
        }

        res.status(201).json({
          message: 'Class created successfully.',
          classId: results.insertId,
        });
      });
    });
  });
});

app.get('/dashboard-classes', (req, res) => {
  const { tutorID } = req.query;

  console.log(`Received request to fetch classes for TutorID: ${tutorID}`);

  if (!tutorID) {
    return res.status(400).json({ message: 'Tutor ID is required to fetch classes.' });
  }

  const query = `
    SELECT ClassID, ClassName, Subject, Day, StartTime, EndTime, RoomNumber
    FROM classes
    WHERE TeacherID = ?
  `;

  db.query(query, [tutorID], (err, results) => {
    if (err) {
      console.error('Error fetching classes:', err.stack);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    console.log(`Classes fetched for TutorID ${tutorID}:`, results);

    res.status(200).json(results);
  });
});


app.post('/cancel-class', (req, res) => {
  const { classID } = req.body;

  if (!classID) {
    return res.status(400).json({ success: false, message: 'Class ID is required.' });
  }

  const deleteQuery = 'DELETE FROM classes WHERE ClassID = ?';
  db.query(deleteQuery, [classID], (err, results) => {
    if (err) {
      console.error('Error canceling class:', err.stack);
      return res.status(500).json({ success: false, message: 'Failed to cancel the class.' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Class not found.' });
    }

    // Notify students logic (optional placeholder)
    console.log(`Students enrolled in ClassID ${classID} have been notified.`);

    res.status(200).json({ success: true, message: 'Class canceled successfully.' });
  });
});


// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});