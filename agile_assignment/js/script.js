document.addEventListener("DOMContentLoaded", function () {
  // Add an event listener to the form
  const studentForm = document.getElementById("studentForm");

  if (studentForm) {
    studentForm.addEventListener("submit", function (event) {
      event.preventDefault(); // Prevent default form submission

      const studentData = {
        firstName: document.getElementById("firstName").value,
        lastName: document.getElementById("lastName").value,
        dob: document.getElementById("dob").value,
        gender: document.getElementById("gender").value,
        contact: document.getElementById("contact").value,
        email: document.getElementById("email").value,
        address: document.getElementById("address").value,
        enrollmentDate: document.getElementById("enrollmentDate").value,
        emergencyContact: document.getElementById("emergencyContact").value,
      };

      // Use fetch to send the data
      fetch("http://localhost:3000/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(studentData),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            alert(`Error: ${data.error}`);
          } else {
            alert("Student added successfully!");
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          alert("Failed to add student.");
        });
    });
  } else {
    console.error("Form with id 'studentForm' not found in the DOM");
  }
});
