document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const statusMsg = document.getElementById('statusMsg');

    statusMsg.className = 'status-msg';
    statusMsg.innerText = '';

    if (newPassword !== confirmPassword) {
        statusMsg.classList.add('error');
        statusMsg.innerText = 'New passwords do not match';
        return;
    }

    if (newPassword.length < 6) {
        statusMsg.classList.add('error');
        statusMsg.innerText = 'Password must be at least 6 characters';
        return;
    }

    try {
        const res = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await res.json();

        if (res.ok) {
            statusMsg.classList.add('success');
            statusMsg.innerText = 'Password updated successfully!';
            document.getElementById('changePasswordForm').reset();
        } else {
            statusMsg.classList.add('error');
            statusMsg.innerText = data.message || 'Failed to update password';
        }

    } catch (err) {
        statusMsg.classList.add('error');
        statusMsg.innerText = 'Server error. Please try again.';
    }
});
