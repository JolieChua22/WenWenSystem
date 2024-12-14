fetch('http://localhost:3000/subject-class-details')
    .then(response => response.json())
    .then(data => {
        const subjectDropdown = document.getElementById('subjectDropdown');
        const classTable = document.getElementById('classTable');
        const classDetailsTable = document.getElementById('classDetailsTable');
        const errorMessage = document.createElement('p'); // Create an error message element
        errorMessage.id = 'errorMessage';
        errorMessage.style.color = 'red';
        errorMessage.style.display = 'none'; // Initially hide the error message
        document.body.appendChild(errorMessage);

        // Group classes by subject
        const subjects = {};
        data.data.forEach(item => {
            if (!subjects[item.subjectName]) {
                subjects[item.subjectName] = [];
            }
            subjects[item.subjectName].push(item);
        });

        // Populate dropdown with subjects
        Object.keys(subjects).forEach(subjectName => {
            const option = document.createElement('option');
            option.value = subjectName;
            option.textContent = subjectName;
            subjectDropdown.appendChild(option);
        });

        // Handle dropdown change event
        subjectDropdown.addEventListener('change', () => {
            const selectedSubject = subjectDropdown.value;

            // Clear any previous error messages and table data
            errorMessage.textContent = '';
            errorMessage.style.display = 'none';
            classDetailsTable.innerHTML = ''; // Clear table rows
            classTable.style.display = 'none'; // Ensure table is hidden by default

            if (selectedSubject) {
                const classes = subjects[selectedSubject];
                if (classes && classes.length > 0) {
                    // Filter and only show rows with valid data
                    const validClasses = classes.filter(classDetail => classDetail.className !== null && classDetail.className !== 'N/A');
                    
                    if (validClasses.length > 0) {
                        validClasses.forEach(classDetail => {
                            const row = document.createElement('tr');

                            // Calculate the status dynamically
                            const enrolled = classDetail.enrolledStudents || 0;
                            const capacity = classDetail.classCapacity || 0;
                            const utilization = capacity > 0 ? (enrolled / capacity) * 100 : 0;

                            let statusText = 'Available';
                            let barClass = 'status-open';

                            if (utilization === 100) {
                                statusText = 'Full';
                                barClass = 'status-full';
                            } else if (utilization >= 80) {
                                statusText = 'Almost Full';
                                barClass = 'status-low';
                            }

                            // Add a status bar inside the status column
                            row.innerHTML = `
                                <td>${classDetail.className}</td>
                                <td>${capacity || 'N/A'}</td>
                                <td>${enrolled}</td>
                                <td>${capacity - enrolled >= 0 ? capacity - enrolled : 'N/A'}</td>
                                <td>${utilization.toFixed(2)}%</td>
                                <td>
                                    <div class="status-bar-container">
                                        <div class="status-bar ${barClass}" style="width: ${utilization}%;"></div>
                                    </div>
                                    <span>${statusText}</span>
                                </td>
                            `;
                            classDetailsTable.appendChild(row);
                        });

                        classTable.style.display = 'table'; // Show the table
                    } else {
                        // If no valid classes, display an error message
                        errorMessage.textContent = `No classes available for the subject "${selectedSubject}".`;
                        errorMessage.style.display = 'block';
                        classTable.style.display = 'none'; // Hide the table
                    }
                } else {
                    // Display error message if no classes exist for the subject
                    errorMessage.textContent = `No classes found for the subject "${selectedSubject}".`;
                    errorMessage.style.display = 'block'; // Show the error message
                    classTable.style.display = 'none'; // Hide the table
                }
            } else {
                // Reset view when no subject is selected
                classTable.style.display = 'none';
                errorMessage.style.display = 'none';
            }
        });
    })
    .catch(error => {
        console.error('Error fetching subject details:', error);
        // Display error message for fetch failure
        const fetchErrorMessage = document.createElement('p');
        fetchErrorMessage.textContent = 'An error occurred while fetching subject details.';
        fetchErrorMessage.style.color = 'red';
        document.body.appendChild(fetchErrorMessage);
    });
