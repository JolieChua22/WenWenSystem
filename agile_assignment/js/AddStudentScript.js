document.addEventListener("DOMContentLoaded", function () {
  const studentForm = document.getElementById("studentForm");

  if (studentForm) {
    if (studentForm.getAttribute("data-listener") !== "true") {
      studentForm.setAttribute("data-listener", "true");

      studentForm.addEventListener("submit", function (event) {
        event.preventDefault(); // Prevent default form submission

        // Validate contact number (only digits allowed)
        const contactNumber = document.getElementById("contact").value;
        if (!/^\d+$/.test(contactNumber)) {
          alert("Contact number must contain only digits.");
          return; // Stop form submission
        }

        // Validate age (at least 7 years old)
        const dob = new Date(document.getElementById("dob").value);
        const today = new Date();
        let ageInYears = today.getFullYear() - dob.getFullYear();
        const monthDifference = today.getMonth() - dob.getMonth();
        const dayDifference = today.getDate() - dob.getDate();

        if (monthDifference < 0 || (monthDifference === 0 && dayDifference < 0)) {
          ageInYears--;
        }

        if (ageInYears < 7) {
          alert("Student must be at least 7 years old.");
          return; // Stop form submission
        }

        // Validate enrollment date
        const enrollmentDateInput = document.getElementById("enrollmentDate").value;
        const enrollmentDate = new Date(enrollmentDateInput);
        today.setHours(0, 0, 0, 0);

        if (enrollmentDate < today) {
          alert("Enrollment date must be today or a future date.");
          return; // Stop form submission
        }

        // If all validations pass, send data to the server
        const studentData = {
          firstName: document.getElementById("firstName").value,
          lastName: document.getElementById("lastName").value,
          dob: document.getElementById("dob").value,
          gender: document.getElementById("gender").value,
          contact: contactNumber,
          email: document.getElementById("email").value,
          address: document.getElementById("address").value,
          enrollmentDate: document.getElementById("enrollmentDate").value,
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
      });
    }
  } else {
    console.error("Form with id 'studentForm' not found in the DOM");
  }
});
