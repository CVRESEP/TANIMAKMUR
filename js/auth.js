// Authentication Management
function checkAuth() {
    if (localStorage.getItem('tm_login_status') !== 'true') {
        window.location.href = 'index.html';
    }
}

function logout(e) {
    if (e) e.preventDefault();
    console.log('Logging out...');
    localStorage.removeItem('tm_login_status');
    localStorage.removeItem('tm_current_user');
    window.location.href = 'index.html';
}

function resetData() {
    openErrorModal('TIDAK DIIZINKAN', 'Fitur reset data dinonaktifkan dalam Mode Cloud untuk keamanan data Anda. Hubungi administrator sistem untuk pembersihan database.');
}

// Session Management
let sessionTimer;
function startSessionTimer() {
    if (sessionTimer) clearInterval(sessionTimer);
    sessionTimer = setInterval(() => {
        // Optional: Implement auto logout or session check
    }, 60000);
}
