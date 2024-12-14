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
// Endpoint to fetch classes based on logged-in tutor
app.get('/classes', (req, res) => {
  const teacherId = req.query.teacherId; // Assume teacherId is passed as a query parameter
  if (!teacherId) {
    return res.status(400).json({ message: 'Teacher ID is required.' });
  }

  const query = 'SELECT * FROM Classes WHERE TeacherID = ?';
  db.query(query, [teacherId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error fetching classes.' });
    }
    res.json(results);
  });
});



// Fetch students by class and date
app.get('/students', (req, res) => {
  const { classId, date } = req.query;
  console.log('Fetching students with:', { classId, date });

  if (!classId || !date) {
    return res.status(400).json({ message: 'Class ID and date are required' });
  }

  const query = `
    SELECT s.StudentID, s.FirstName, s.LastName, a.Status
    FROM Student_Class_relationship scr
    JOIN Students s ON scr.StudentID = s.StudentID
    LEFT JOIN Attendance a ON scr.StudentID = a.StudentID AND scr.ClassID = a.ClassID AND a.Date = ?
    WHERE scr.ClassID = ?
  `;

  db.query(query, [date, classId], (err, results) => {
    if (err) {
      console.error('Error fetching students:', err);
      return res.status(500).json({ message: 'Error fetching students' });
    }
    console.log('Students fetched:', results);
    res.json(results);
  });
});


app.post('/mark-attendance', (req, res) => {
  const attendanceData = req.body;

  if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
    return res.status(400).json({ message: 'Invalid attendance data.' });
  }

  const query = `
    INSERT INTO Attendance (StudentID, ClassID, Date, Status)
    VALUES ? ON DUPLICATE KEY UPDATE Status = VALUES(Status)
  `;

  const values = attendanceData.map(({ studentId, classId, date, status }) => [
    studentId,
    classId,
    date,
    status,
  ]);

  db.query(query, [values], err => {
    if (err) {
      console.error('Error saving attendance:', err);
      res.status(500).json({ message: 'Failed to save attendance.' });
    } else {
      res.status(200).json({ message: 'Attendance saved successfully!' });
    }
  });
});




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
    // Check if the queryTerm is an integer (assuming StudentID is numeric)
    if (!isNaN(parseInt(queryTerm))) {
      query += ' WHERE StudentID = ?';
      params.push(parseInt(queryTerm));
    } else {
      // Define all fields to search across except StudentID
      const searchFields = [
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
      const searchConditions = searchFields.map(field => `${field} LIKE ?`).join(' OR ');
      query += ` WHERE ${searchConditions}`;

      // Prepare the search pattern for each field
      const searchPattern = `%${queryTerm}%`;
      params = Array(searchFields.length).fill(searchPattern);
    }
  }

  // Handle sorting if sortField is provided and valid
  if (sortField && allowedSortFields.includes(sortField)) {
    query += ` ORDER BY ${sortField} ${sortOrder}`;
  }

  console.log('Executing Query:', query);
  console.log('With Parameters:', params);

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    console.log('Number of Records Found:', results.length);
    res.json(results);
  });
});


//sprint2
// ================== New Routes for Assigning Students to Classes ==================
// Route to fetch all classes
app.get('/classes', (req, res) => {
  console.log('Fetching classes...');
  const query = 'SELECT ClassID, ClassName FROM classes';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching classes:', err.stack);
      return res.status(500).json({ message: 'Database error' });
    }
    res.status(200).json(results); // Return class details
  });
});

// Route to assign a student to a class
app.post('/assign-student', (req, res) => {
  const { studentId, classId, performanceGrade } = req.body;

  // Validate inputs
  if (!studentId || !classId) {
    return res.status(400).json({ message: 'Student ID and Class ID are required.' });
  }

  // Optional: Validate performanceGrade if provided
  const allowedGrades = ['A', 'B', 'C', 'D', 'F', '-'];
  if (performanceGrade && !allowedGrades.includes(performanceGrade.toUpperCase())) {
    return res.status(400).json({ message: 'Invalid Performance Grade.' });
  }

  // Check if the assignment already exists
  const checkQuery = `
    SELECT * FROM student_class_relationship
    WHERE StudentID = ? AND ClassID = ?
    LIMIT 1
  `;

  db.query(checkQuery, [studentId, classId], (err, results) => {
    if (err) {
      console.error('Error checking existing assignment:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.length > 0) {
      // Assignment already exists
      return res.status(409).json({ message: 'Student is already assigned to this class.' });
    }

    // Insert the assignment since it doesn't exist
    const insertQuery = `
      INSERT INTO student_class_relationship (StudentID, ClassID, EnrollmentDate, PerformanceGrade)
      VALUES (?, ?, CURDATE(), ?)
    `;

    db.query(insertQuery, [studentId, classId, performanceGrade || null], (err, results) => {
      if (err) {
        console.error('Error assigning student to class:', err);
        return res.status(500).json({ message: 'Database error' });
      }

      res.status(200).json({ message: 'Student assigned to class successfully!' });
    });
  });
});
// Route to fetch all class assignments
app.get('/student-classes', (req, res) => {
  console.log('Fetching student-class assignments...');
  const query = `
    SELECT sc.StudentID, s.FirstName, s.LastName, sc.ClassID, c.ClassName, sc.EnrollmentDate
    FROM student_classes sc
    JOIN Students s ON sc.StudentID = s.StudentID
    JOIN classes c ON sc.ClassID = c.ClassID
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching student-class assignments:', err.stack);
      return res.status(500).json({ message: 'Database error' });
    }
    res.status(200).json(results); // Return assignments
  });
});

// Route to fetch classes by subject ID
app.get('/classes-by-subject', (req, res) => {
  const subjectId = req.query.subjectId;

  if (!subjectId) {
    return res.status(400).json({ message: 'Subject ID is required.' });
  }

  const query = 'SELECT ClassID, ClassName FROM classes WHERE Subject = ?';
  db.query(query, [subjectId], (err, results) => {
    if (err) {
      console.error('Error fetching classes by subject:', err.stack);
      return res.status(500).json({ message: 'Database error' });
    }
    res.status(200).json(results);
  });
});

// Route to fetch class details by ClassID, including Teacher's name
app.get('/class-details', (req, res) => {
  const classId = req.query.classId;

  if (!classId) {
    return res.status(400).json({ message: 'Class ID is required.' });
  }

  const query = `
    SELECT 
      c.ClassID, 
      c.ClassName, 
      s.SubjectName, 
      CONCAT(t.FirstName, ' ', t.LastName) AS TeacherName,
      c.Day, 
      c.StartTime, 
      c.EndTime, 
      c.RoomNumber
    FROM classes c
    JOIN subjects s ON c.Subject = s.SubjectID
    JOIN teachers t ON c.TeacherID = t.TeacherID
    WHERE c.ClassID = ?
  `;

  db.query(query, [classId], (err, results) => {
    if (err) {
      console.error('Error fetching class details:', err.stack);
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    res.status(200).json(results[0]);
  });
});
//sprint3

// Route to update student details
app.put('/update-student', (req, res) => {
  const {
    StudentID,
    FirstName,
    LastName,
    DateOfBirth,
    Gender,
    ContactNumber,
    Email,
    Address,
    EnrollmentDate,
    EmergencyContact
  } = req.body;

  // Validate required fields
  if (
    !StudentID ||
    !FirstName ||
    !LastName ||
    !DateOfBirth ||
    !Gender ||
    !ContactNumber ||
    !Email ||
    !Address ||
    !EnrollmentDate ||
    !EmergencyContact
  ) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // Check for duplicate email or contact number
  const checkDuplicateQuery = `
    SELECT * FROM Students 
    WHERE (Email = ? OR ContactNumber = ?) AND StudentID != ?
  `;
  db.query(checkDuplicateQuery, [Email, ContactNumber, StudentID], (err, results) => {
    if (err) {
      console.error('Error checking for duplicates:', err.stack);
      return res.status(500).json({ message: 'Database error.' });
    }

    if (results.length > 0) {
      return res.status(409).json({ message: 'Email or Contact Number already exists.' });
    }

    // Update query using parameterized inputs
    const updateQuery = `
      UPDATE Students
      SET FirstName = ?, LastName = ?, DateOfBirth = ?, Gender = ?, ContactNumber = ?, Email = ?, Address = ?, EnrollmentDate = ?, EmergencyContact = ?
      WHERE StudentID = ?
    `;

    db.query(
      updateQuery,
      [
        FirstName,
        LastName,
        DateOfBirth,
        Gender,
        ContactNumber,
        Email,
        Address,
        EnrollmentDate,
        EmergencyContact,
        StudentID
      ],
      (err, results) => {
        if (err) {
          console.error('Error updating student:', err.stack);
          return res.status(500).json({ message: 'Database error.' });
        }

        if (results.affectedRows === 0) {
          return res.status(404).json({ message: 'Student not found.' });
        }

        res.status(200).json({ message: 'Student details updated successfully!' });
      }
    );
  });
});

//ks
// Sprint 1

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


// Sprint 2
// Route to assign tutor to a subject
app.post('/assign-tutor', (req, res) => {
  const { tutorID, subjectID } = req.body;

  // Validate inputs
  if (!tutorID || !subjectID) {
    return res.status(400).json({ success: false, message: 'Tutor ID and Subject ID are required.' });
  }

  // Check if the tutor is already assigned to the selected subject
  const checkAssignmentQuery = `
    SELECT * FROM TeacherSubject 
    WHERE TeacherID = ? AND SubjectID = ? AND Status = 'Active'
  `;
  db.query(checkAssignmentQuery, [tutorID, subjectID], (err, results) => {
    if (err) {
      console.error('Error checking assignment:', err.stack);
      return res.status(500).json({ success: false, message: 'Database error.' });
    }

    if (results.length > 0) {
      // If the teacher is already assigned to the subject, return an error message
      return res.status(409).json({ success: false, message: 'This tutor is already assigned to the selected subject.' });
    }

    // Check if the tutor is already teaching two active subjects
    const countQuery = `
      SELECT COUNT(*) AS subjectCount 
      FROM TeacherSubject 
      WHERE TeacherID = ? AND Status = 'Active'
    `;
    db.query(countQuery, [tutorID], (err, results) => {
      if (err) {
        console.error('Error checking subject count:', err.stack);
        return res.status(500).json({ success: false, message: 'Database error.' });
      }

      const { subjectCount } = results[0];
      if (subjectCount >= 2) {
        // If the tutor is teaching two active subjects, return an error message
        return res.status(409).json({ success: false, message: 'This tutor is already teaching two subjects.' });
      }

      // Check if the record exists in the database
      const checkAndUpsertQuery = `
        INSERT INTO TeacherSubject (TeacherID, SubjectID, Status)
        VALUES (?, ?, 'Active')
        ON DUPLICATE KEY UPDATE
        Status = 'Active'
      `;
      db.query(checkAndUpsertQuery, [tutorID, subjectID], (err, results) => {
        if (err) {
          console.error('Error during assignment:', err.stack);
          return res.status(500).json({ success: false, message: 'Database error during assignment.' });
        }

        if (results.affectedRows === 1) {
          res.status(201).json({ success: true, message: 'Tutor successfully assigned to subject.' });
        } else {
          res.status(200).json({ success: true, message: 'Tutor assignment reactivated successfully.' });
        }
      });

    });
  });
});

// Sprint 3
app.get('/subject-class-details', (req, res) => {
  const query = `
    SELECT 
        s.SubjectName AS subjectName,
        c.ClassName AS className,
        c.Capacity AS classCapacity,
        COUNT(scr.StudentID) AS enrolledStudents,
        c.Capacity - COUNT(scr.StudentID) AS availableSeats,
        CONCAT(ROUND((COUNT(scr.StudentID) / COALESCE(c.Capacity, 1)) * 100, 2), '%') AS utilization,
        CASE
            WHEN COUNT(scr.StudentID) >= c.Capacity THEN 'Full'
            WHEN COUNT(scr.StudentID) / COALESCE(c.Capacity, 1) >= 0.8 THEN 'Almost Full'
            ELSE 'Available'
        END AS status
    FROM 
        Subjects s
    LEFT JOIN 
        Classes c ON s.SubjectID = c.Subject
    LEFT JOIN 
        Student_Class_relationship scr ON c.ClassID = scr.ClassID
    GROUP BY 
        s.SubjectName, c.ClassName, c.Capacity
    ORDER BY 
        s.SubjectName, c.ClassName;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching subject-class details:', err.stack);
      return res.status(500).json({ success: false, message: 'Database error.' });
    }

    res.status(200).json({ success: true, data: results });
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

  const checkRelationshipsQuery = 'SELECT COUNT(*) AS count FROM student_class_relationship WHERE ClassID = ?';
  const deleteClassQuery = 'DELETE FROM classes WHERE ClassID = ?';

  db.query(checkRelationshipsQuery, [classID], (err, results) => {
    if (err) {
      console.error('Error checking relationships:', err.stack);
      return res.status(500).json({ success: false, message: 'Failed to check class dependencies.' });
    }

    if (results[0].count > 0) {
      return res.status(400).json({ success: false, message: 'Class cannot be canceled because students are still enrolled.' });
    }

    db.query(deleteClassQuery, [classID], (err, results) => {
      if (err) {
        console.error('Error canceling class:', err.stack);
        return res.status(500).json({ success: false, message: 'Failed to cancel the class.' });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Class not found.' });
      }

      res.status(200).json({ success: true, message: 'Class canceled successfully.' });
    });
  });
});


// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

