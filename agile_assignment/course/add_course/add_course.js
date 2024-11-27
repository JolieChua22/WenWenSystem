async function createSubject() {
    const subjectName = document.getElementById('subjectName').value;
    const description = document.getElementById('description').value;
    const level = document.getElementById('level').value;
  
    try {
      const response = await fetch('http://localhost:3000/createSubject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectName, description, level }),
      });
  
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create subject');
      }
  
      const result = await response.json();
      const messageElement = document.getElementById('message');
  
      messageElement.textContent = 'Subject created successfully!';
      messageElement.style.color = 'green';
      document.getElementById('subjectForm').reset();
    } catch (error) {
      console.error('Error:', error.message);
      const messageElement = document.getElementById('message');
      messageElement.textContent = error.message || 'Failed to connect to the server.';
      messageElement.style.color = 'red';
    }
  }
  