// Validation functions
function validateContact(contact) {
  if (!/^\d+$/.test(contact)) {
    throw new Error('Contact number must contain only digits.');
  }
}

function validateAge(dob) {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }
  if (age < 7) {
    throw new Error('Student must be at least 7 years old.');
  }
}

function validateEnrollmentDate(enrollmentDate) {
  const today = new Date();
  const date = new Date(enrollmentDate);
  if (date < today.setHours(0, 0, 0, 0)) {
    throw new Error('Enrollment date must be today or a future date.');
  }
}

// Function to initialize the DOM event listener
function initFormListener() {
  document.addEventListener("DOMContentLoaded", function () {
    const studentForm = document.getElementById("studentForm");

    if (studentForm) {
      if (studentForm.getAttribute("data-listener") !== "true") {
        studentForm.setAttribute("data-listener", "true");

        studentForm.addEventListener("submit", function (event) {
          event.preventDefault(); // Prevent default form submission

          try {
            // Validate contact number
            const contactNumber = document.getElementById("contact").value;
            validateContact(contactNumber);

            // Validate age
            const dob = document.getElementById("dob").value;
            validateAge(dob);

            // Validate enrollment date
            const enrollmentDate = document.getElementById("enrollmentDate").value;
            validateEnrollmentDate(enrollmentDate);

            // If all validations pass, send data to the server
            const studentData = {
              firstName: document.getElementById("firstName").value,
              lastName: document.getElementById("lastName").value,
              dob: dob,
              gender: document.getElementById("gender").value,
              contact: contactNumber,
              email: document.getElementById("email").value,
              address: document.getElementById("address").value,
              enrollmentDate: enrollmentDate,
              emergencyContact: document.getElementById("emergencyContact").value,
            };

            fetch("http://localhost:3000/submit", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(studentData),
            })
              .then((response) => {
                if (!response.ok) {
                  return response.json().then((data) => {
                    throw new Error(data.error || "Failed to add student.");
                  });
                }
                return response.json();
              })
              .then((data) => {
                alert(data.message); // Success message
              })
              .catch((error) => {
                alert(error.message); // Display the error message
              });
          } catch (error) {
            alert(error.message); // Display validation errors
          }
        });
      }
    } else {
      console.error("Form with id 'studentForm' not found in the DOM");
    }
  });
}

// Exports for testing
module.exports = {
  validateContact,
  validateAge,
  validateEnrollmentDate,
  initFormListener, // Optional: Export DOM logic for testing
};
