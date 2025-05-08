document.getElementById('login-form').onsubmit = async function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    const messageDiv = document.getElementById('message');
    if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token); // Store token for future requests
        messageDiv.textContent = 'Login successful!';
        // Redirect to the main application after a short delay
        setTimeout(() => {
            window.location.href = 'index.html'; // Redirect to the main application
        }, 1000); // 1 second delay for user feedback
    } else {
        messageDiv.textContent = 'Invalid credentials.';
    }
};

// Show sign-up form
document.getElementById('show-signup').onclick = function() {
    document.getElementById('signup-form').style.display = 'block';
    document.getElementById('login-form').style.display = 'none';
};

// Sign-up functionality
document.getElementById('signup-form').onsubmit = async function(event) {
    event.preventDefault();
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-password').value;

    const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    const messageDiv = document.getElementById('message');
    if (response.ok) {
        messageDiv.textContent = 'Sign-up successful! You can now log in.';
        document.getElementById('signup-form').reset();
        document.getElementById('signup-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
    } else {
        messageDiv.textContent = 'Sign-up failed. Username may already be taken.';
    }
};
