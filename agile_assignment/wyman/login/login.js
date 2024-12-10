document.getElementById('login-form').addEventListener('submit', function (event) {
    event.preventDefault();

    const teacherID = document.getElementById('teacherID').value;
    const password = document.getElementById('password').value;

    console.log('Submitting Login:', { teacherID, password }); // Debugging input

    // Send login request to the server
    fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            teacherID: teacherID,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Server Response:', data); // Debugging server response
        if (data.message === 'Login successful!') {
            // Store teacher details in sessionStorage
            sessionStorage.setItem('teacherID', data.teacherID);
            sessionStorage.setItem('firstName', data.firstName);
            sessionStorage.setItem('lastName', data.lastName);

            alert('Login successful!');
            window.location.href = 'successLogin.html';  // Redirect to successLogin.html
        } else {
            document.getElementById('error-message').textContent = data.message;
        }
    })
    .catch(error => {
        console.error('Error during login:', error);
        document.getElementById('error-message').textContent = 'An error occurred. Please try again later.';
    });
});
