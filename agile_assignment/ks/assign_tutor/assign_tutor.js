document.addEventListener('DOMContentLoaded', () => {
    const subjectDropdown = document.getElementById('subject');
    const tutorDropdown = document.getElementById('tutor');
    const responseMessage = document.getElementById('responseMessage');

    // Fetch subjects and populate dropdown
    fetch('http://localhost:3000/get-subjects')
        .then((response) => response.json())
        .then((data) => {
            data.forEach((subject) => {
                const option = document.createElement('option');
                option.value = subject.SubjectID;
                option.textContent = subject.SubjectName;
                subjectDropdown.appendChild(option);
            });
        })
        .catch((error) => console.error('Error fetching subjects:', error));

    // Fetch tutors and populate dropdown
    fetch('http://localhost:3000/get-teachers')
        .then((response) => response.json())
        .then((data) => {
            data.forEach((tutor) => {
                const option = document.createElement('option');
                option.value = tutor.TeacherID;
                option.textContent = `${tutor.FirstName} ${tutor.LastName} (${tutor.SubjectSpecialization})`;
                tutorDropdown.appendChild(option);
            });
        })
        .catch((error) => console.error('Error fetching tutors:', error));

    // Handle form submission
    document.getElementById('assignForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const subjectID = subjectDropdown.value;
        const tutorID = tutorDropdown.value;

        // Validate inputs
        if (!subjectID || !tutorID) {
            responseMessage.textContent = 'Please select both a subject and a tutor.';
            responseMessage.style.color = 'red';
            return;
        }

        // Assign tutor to subject
        fetch('http://localhost:3000/assign-tutor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ subjectID, tutorID }),
        })
            .then((response) => response.json())
            .then((data) => {
                responseMessage.textContent = data.message;
                responseMessage.style.color = data.success ? 'green' : 'red';
            })
            .catch((error) => {
                console.error('Error:', error);
                responseMessage.textContent = 'Failed to assign tutor.';
                responseMessage.style.color = 'red';
            });
    });
});
