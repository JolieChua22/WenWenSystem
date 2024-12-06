// Add Course Javascript
async function createSubject() {
  const subjectName = document.getElementById('subjectName').value.trim(); // Trim whitespace
  const description = document.getElementById('description').value.trim(); // Trim whitespace
  const level = document.getElementById('level').value;

  const messageElement = document.getElementById('message');

  // Frontend validation to ensure all fields are filled
  if (!subjectName || !description || !level) {
    messageElement.textContent = 'All fields are required.';
    messageElement.style.color = 'red';
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/createSubject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectName, description, level }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create subject.');
    }

    const result = await response.json();
    messageElement.textContent = result.message;
    messageElement.style.color = 'green';
    document.getElementById('subjectForm').reset();
  } catch (error) {
    console.error('Error:', error.message);
    messageElement.textContent = error.message || 'Failed to connect to the server.';
    messageElement.style.color = 'red';
  }
}