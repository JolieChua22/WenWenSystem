document.getElementById("myForm").addEventListener("submit", function (event) {
  event.preventDefault(); // Prevent default form submission

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;

  fetch("http://localhost:3000/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        alert(`Error: ${data.error}`);
      } else {
        alert("Data submitted successfully!");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Failed to submit data.");
    });
});

  