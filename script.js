// Tani Makmur - Authentication & Session Logic

const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes in milliseconds
let inactivityTimer;
let timeLeft = INACTIVITY_LIMIT;
let countdownInterval;

const loginForm = document.getElementById('login-form');
const dashboard = document.getElementById('dashboard');
const authForm = document.getElementById('auth-form');
const timerDisplay = document.getElementById('timer-display');
const logoutButton = document.getElementById('logout-button');

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    const btn = document.getElementById('login-button');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Memuat Data...';
    }

    if (window._stateReady) {
        await window._stateReady;
    }

    if (btn) {
        btn.disabled = false;
        btn.textContent = 'Masuk ke Sistem';
    }

    checkSession();
    setupActivityListeners();
});

// Check if user is already logged in
function checkSession() {
    const isLoggedIn = localStorage.getItem('tm_login_status');
    const lastActive = localStorage.getItem('tm_last_active');
    
    if (isLoggedIn === 'true') {
        const now = Date.now();
        const inactiveTime = now - parseInt(lastActive || now);
        
        if (inactiveTime > INACTIVITY_LIMIT) {
            localStorage.removeItem('tm_login_status');
            showLoginForm();
        } else {
            // Redirect to the main dashboard
            window.location.href = 'dashboard.html';
        }
    } else {
        showLoginForm();
    }
}

// Handle Login
authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const usernameInput = document.getElementById('username').value.toLowerCase();
    const passwordInput = document.getElementById('password').value;
    const user = STATE.users.find(u => u.username === usernameInput);

    if (!user) {
        alert('Gagal: Username tidak ditemukan.');
        return;
    }
    
    // Check Password
    if (user.password && user.password !== passwordInput) {
        alert('Gagal: Password yang Anda masukkan salah!');
        return;
    }
    
    // Store session
    localStorage.setItem('tm_login_status', 'true');
    localStorage.setItem('tm_current_user', JSON.stringify(user));
    localStorage.setItem('tm_last_active', Date.now().toString());
    
    const btn = document.getElementById('login-button');
    btn.textContent = 'Menghubungkan...';
    btn.style.opacity = '0.7';
    
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 800);
});

// Handle Logout
logoutButton.addEventListener('click', () => {
    logout();
});

function logout() {
    localStorage.removeItem('tm_login_status');
    localStorage.removeItem('tm_last_active');
    clearInterval(countdownInterval);
    clearTimeout(inactivityTimer);
    
    // Smooth transition back to login
    dashboard.style.opacity = '0';
    setTimeout(() => {
        window.location.reload();
    }, 300);
}

function showDashboard() {
    loginForm.style.display = 'none';
    dashboard.style.display = 'block';
    dashboard.style.opacity = '1';
}

function showLoginForm() {
    loginForm.style.display = 'block';
    dashboard.style.display = 'none';
}

// Inactivity Logic
function startInactivityTimer() {
    clearTimeout(inactivityTimer);
    clearInterval(countdownInterval);
    
    timeLeft = INACTIVITY_LIMIT;
    updateTimerDisplay();
    
    inactivityTimer = setTimeout(() => {
        alert('Sesi Anda telah berakhir karena tidak ada aktivitas selama 5 menit.');
        logout();
    }, INACTIVITY_LIMIT);
    
    countdownInterval = setInterval(() => {
        timeLeft -= 1000;
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
        }
        updateTimerDisplay();
    }, 1000);
}

function resetInactivityTimer() {
    if (localStorage.getItem('tm_login_status') === 'true') {
        localStorage.setItem('tm_last_active', Date.now().toString());
        startInactivityTimer();
        console.log('Activity detected, timer reset.');
    }
}

function updateTimerDisplay() {
    if (!timerDisplay) return;
    
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    
    timerDisplay.textContent = `Sesi berakhir dalam: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Visual warning when less than 1 minute remains
    if (timeLeft < 60000) {
        timerDisplay.style.color = '#ff4d4d';
    } else {
        timerDisplay.style.color = 'var(--accent)';
    }
}

function setupActivityListeners() {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(event => {
        window.addEventListener(event, throttle(resetInactivityTimer, 2000));
    });
}

// Throttle function to avoid excessive timer resets
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}
