// Manajemen Otentikasi
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

// Manajemen Sesi
let sessionTimer;
function startSessionTimer() {
    if (sessionTimer) clearInterval(sessionTimer);
    sessionTimer = setInterval(() => {
        // Opsional: Terapkan logout otomatis atau pemeriksaan sesi
    }, 60000);
}
