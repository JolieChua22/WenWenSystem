let allClasses = []; // To store all classes
let allStudents = []; // To store the list of all students

// Fetch all classes for the logged-in tutor and populate the dropdown
async function fetchClasses() {
  const teacherId = sessionStorage.getItem('teacherId') || localStorage.getItem('teacherId'); // Check both storages

  if (!teacherId) {
    alert('Unable to identify the logged-in tutor. Please log in again.');
    window.location.href = '../login/login.html'; // Redirect to login page
    return;
  }

  try {
    const response = await fetch(`http://localhost:3000/classes?teacherId=${teacherId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch classes');
    }

    const classes = await response.json();
    allClasses = classes; // Store classes in the global array

    console.log('Fetched Classes:', allClasses);

    const classSelect = document.getElementById('class');
    classes.forEach(cls => {
      const option = document.createElement('option');
      option.value = cls.ClassID;
      option.textContent = `${cls.ClassName} (${cls.RoomNumber})`;
      option.setAttribute('data-day', cls.Day); // Store the class day as a data attribute
      classSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    alert('Failed to load classes. Please try again.');
  }
}



// Validate selected date against the class day
function validateDate(classId, selectedDate) {
  const selectedClass = allClasses.find(cls => cls.ClassID == classId);
  if (!selectedClass) {
    console.error('No matching class found for ClassID:', classId);
    return false;
  }

  const classDay = selectedClass.Day;
  const dayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });

  console.log(`Class Day: ${classDay}, Selected Date Day: ${dayOfWeek}`);
  return classDay === dayOfWeek;
}



// Fetch students by class and date
async function fetchStudents(classId, date) {
  try {
    const isValidDate = validateDate(classId, date);
    const errorMessage = document.getElementById('error-message');
    const studentsList = document.getElementById('students-list');

    studentsList.innerHTML = '';
    document.getElementById('room-info').textContent = '';

    if (!isValidDate) {
      errorMessage.textContent = 'The selected date does not match the scheduled day for this class.';
      return;
    }

    errorMessage.textContent = ''; // Clear error message

    console.log('Fetching students for:', { classId, date });

    const response = await fetch(`http://localhost:3000/students?classId=${classId}&date=${date}`);
    if (!response.ok) {
      console.error('Error fetching students:', response.statusText);
      studentsList.innerHTML = '<tr><td colspan="3">Failed to fetch students</td></tr>';
      return;
    }

    const students = await response.json();
    console.log('Students fetched:', students);

    if (students.length > 0) {
      const selectedClass = allClasses.find(cls => cls.ClassID == classId);
      document.getElementById('room-info').textContent = `Room Number: ${selectedClass.RoomNumber}`;
    } else {
      document.getElementById('room-info').textContent = 'Room Number: N/A';
    }

    allStudents = students; // Store the students in the global array
    displayStudents(allStudents);
  } catch (error) {
    console.error('Error fetching students:', error);
    document.getElementById('students-list').innerHTML = '<tr><td colspan="3">Error loading students</td></tr>';
  }
}


async function fetchStudentsAPI(classId, date) {
  try {
    const response = await fetch(`http://localhost:3000/students?classId=${classId}&date=${date}`);
    if (!response.ok) {
      console.error('Error fetching students:', response.statusText);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Error making API request:', error);
    return [];
  }
}



// Filter students by name
function filterStudentsByName() {
  const searchInput = document.getElementById('search-student').value.toLowerCase();
  const filteredStudents = allStudents.filter(student => {
    const fullName = `${student.FirstName} ${student.LastName}`.toLowerCase();
    return fullName.includes(searchInput);
  });
  displayStudents(filteredStudents);
}

// Display students in the table or show a "No records found" message
function displayStudents(students) {
  const studentsList = document.getElementById('students-list');
  studentsList.innerHTML = ''; // Clear the previous student list

  if (students.length === 0) {
    const noRecordRow = document.createElement('tr');
    noRecordRow.innerHTML = `
      <td colspan="3" style="text-align: center; font-weight: bold; color: red;">
        No student records found.
      </td>
    `;
    studentsList.appendChild(noRecordRow);
    return;
  }

  students.forEach((student, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${student.FirstName} ${student.LastName}</td>
      <td>
        <div class="radio-group">
          <label><input type="radio" name="attendance-${student.StudentID}" value="Present" ${student.Status === 'Present' ? 'checked' : ''}> Present</label>
          <label><input type="radio" name="attendance-${student.StudentID}" value="Absent" ${student.Status === 'Absent' ? 'checked' : ''}> Absent</label>
          <label><input type="radio" name="attendance-${student.StudentID}" value="Leave" ${student.Status === 'Leave' ? 'checked' : ''}> Leave</label>
        </div>
      </td>
    `;
    studentsList.appendChild(row);
  });
}

// Save attendance
async function saveAttendance() {
  const classId = document.getElementById('class').value;
  const date = document.getElementById('date').value;

  if (!classId || !date) {
    alert('Please select a class and date.');
    return;
  }

  const isValidDate = validateDate(classId, date);
  if (!isValidDate) {
    alert('The selected date does not match the scheduled day for this class.');
    return;
  }

  const studentRows = document.querySelectorAll('#students-list tr');
  const attendanceData = Array.from(studentRows).map(row => {
    const studentId = row.querySelector('input[name^="attendance-"]').name.split('-')[1];
    const statusInput = row.querySelector('input[name^="attendance-"]:checked');
    const status = statusInput ? statusInput.value : 'Absent'; // Default to 'Absent' if not selected
    return { studentId, classId, date, status };
  });

  // Check if any attendance status is defaulting to "Absent"
  const defaultAbsentCount = attendanceData.filter(data => data.status === 'Absent' && !document.querySelector(`input[name^="attendance-${data.studentId}"]:checked`)).length;

  if (defaultAbsentCount > 0) {
    const confirmAbsent = confirm(
      `You have not marked attendance for ${defaultAbsentCount} student(s). Their status will default to "Absent". Do you want to continue?`
    );
    if (!confirmAbsent) {
      return; // Exit if the user cancels
    }
  }

  try {
    const response = await fetch('http://localhost:3000/mark-attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendanceData)
    });

    if (response.ok) {
      alert('Attendance saved successfully!');
    } else {
      alert('Failed to save attendance.');
    }
  } catch (error) {
    console.error('Error saving attendance:', error);
  }
}

// Event listeners
document.getElementById('search').addEventListener('click', () => {
  const classId = document.getElementById('class').value;
  const date = document.getElementById('date').value;
  if (classId && date) {
    fetchStudents(classId, date);
  }
});

// Event listener for student name search
document.getElementById('search-student').addEventListener('input', filterStudentsByName);

document.getElementById('save-attendance').addEventListener('click', saveAttendance);

// Event listeners
document.getElementById('search').addEventListener('click', () => {
  const classId = document.getElementById('class').value;
  const date = document.getElementById('date').value;
  const errorMessage = document.getElementById('error-message');

  // Check if class or date is not selected
  if (!classId || !date) {
    errorMessage.textContent = 'Please select a class and date before searching.';
    return;
  }

  errorMessage.textContent = ''; // Clear any previous error message
  fetchStudents(classId, date);
});

document.getElementById('save-attendance').addEventListener('click', () => {
  const classId = document.getElementById('class').value;
  const date = document.getElementById('date').value;
  const errorMessage = document.getElementById('error-message');

  // Check if class or date is not selected
  if (!classId || !date) {
    errorMessage.textContent = 'Please select a class and date before saving attendance.';
    return;
  }

  errorMessage.textContent = ''; // Clear any previous error message
  saveAttendance();
});


// Initialize
fetchClasses();
