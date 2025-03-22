// Configuración - URL de tu Google Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbw5BpjSO7huY3uscaiMgBtfJliGakrIc5VIY3rHlWnfvWHhmtfZukvJaKgh_Gn82ACx/exec";

// Variables globales
let timer;
let seconds = 0;
let minutes = 0;
let hours = 0;
let isRunning = false;
let startTime;
let pausedTime = 0;
let userData = null;

// Elementos DOM
const userSelect = document.getElementById('userSelect');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const currentUserSpan = document.getElementById('currentUser');
const timerContainer = document.querySelector('.timer-container');
const timerDisplay = document.querySelector('.timer');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const caseType = document.getElementById('caseType');
const priority = document.getElementById('priority');
const caseNotes = document.getElementById('caseNotes');
const statusMessage = document.getElementById('statusMessage');

// Eventos
loginBtn.addEventListener('click', selectUser);
logoutBtn.addEventListener('click', logout);
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
stopBtn.addEventListener('click', stopTimer);

// Cargar usuarios desde Google Sheets al iniciar
window.onload = function() {
    loadUsers();
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        userData = JSON.parse(savedUser);
        showTimerInterface();
    }
}

// Cargar usuarios desde Google Sheets
function loadUsers() {
    fetch(`${API_URL}?action=getUsers`, {
        method: 'GET'
    })
    .then(response => response.json())
    .then(data => {
        const users = data.users;
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = JSON.stringify({ name: user[0], position: user[1] });
            option.textContent = `${user[0]} - ${user[1]}`;
            userSelect.appendChild(option);
        });
    })
    .catch(error => {
        console.error("Error al cargar usuarios:", error);
        showStatus("No se pudieron cargar los usuarios", "error");
    });
}

// Funciones
function selectUser() {
    if (userSelect.value) {
        userData = JSON.parse(userSelect.value);
        localStorage.setItem('currentUser', JSON.stringify(userData));
        showTimerInterface();
    } else {
        showStatus("Por favor selecciona un usuario", "error");
    }
}

function logout() {
    document.querySelector('.user-select').style.display = 'block';
    timerContainer.style.display = 'none';
    localStorage.removeItem('currentUser');
    userData = null;
    resetTimer();
}

function showTimerInterface() {
    document.querySelector('.user-select').style.display = 'none';
    timerContainer.style.display = 'block';
    currentUserSpan.textContent = userData.name;
}

function startTimer() {
    if (!caseType.value || !priority.value) {
        showStatus("Por favor selecciona el tipo de caso y la prioridad", "warning");
        return;
    }
    
    if (!isRunning) {
        startTime = new Date().getTime() - (pausedTime * 1000);
        isRunning = true;
        timer = setInterval(updateTimer, 1000);
        
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        
        caseType.disabled = true;
        priority.disabled = true;
        
        showStatus("Cronómetro iniciado", "success");
    }
}

function pauseTimer() {
    if (isRunning) {
        clearInterval(timer);
        isRunning = false;
        pausedTime = (hours * 3600) + (minutes * 60) + seconds;
        
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        startBtn.textContent = "Reanudar";
        
        showStatus("Cronómetro en pausa", "warning");
    }
}

function stopTimer() {
    if (!isRunning && pausedTime === 0) {
        showStatus("No hay un caso activo para finalizar", "error");
        return;
    }
    
    clearInterval(timer);
    
    const endTime = new Date();
    const startDateTime = new Date(startTime);
    const duration = Math.floor((endTime.getTime() - startTime) / 1000 / 60); // Duración en minutos
    
    const caseData = {
        user: userData.name,
        position: userData.position,
        date: formatDate(endTime),
        startTime: formatTime(startDateTime),
        endTime: formatTime(endTime),
        duration: duration,
        type: caseType.value,
        priority: priority.value,
        notes: caseNotes.value
    };
    
    saveCase(caseData);
    resetTimer();
}

function updateTimer() {
    seconds++;
    if (seconds >= 60) {
        seconds = 0;
        minutes++;
        if (minutes >= 60) {
            minutes = 0;
            hours++;
        }
    }
    
    timerDisplay.textContent = 
        (hours < 10 ? "0" + hours : hours) + ":" + 
        (minutes < 10 ? "0" + minutes : minutes) + ":" + 
        (seconds < 10 ? "0" + seconds : seconds);
}

function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    seconds = 0;
    minutes = 0;
    hours = 0;
    pausedTime = 0;
    
    timerDisplay.textContent = "00:00:00";
    
    startBtn.disabled = false;
    startBtn.textContent = "Iniciar caso";
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    
    caseType.disabled = false;
    priority.disabled = false;
    caseType.value = "";
    priority.value = "";
    caseNotes.value = "";
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function formatTime(date) {
    return date.toTimeString().split(' ')[0];
}

function saveCase(caseData) {
    showStatus("Guardando caso...", "warning");
    
    fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(caseData),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.result === "success") {
            showStatus("Caso finalizado y guardado correctamente", "success");
        } else {
            showStatus("Error al guardar en línea", "error");
            saveLocally(caseData);
        }
    })
    .catch(error => {
        console.error("Error:", error);
        showStatus("Error de conexión. Guardado localmente", "warning");
        saveLocally(caseData);
    });
}

function saveLocally(caseData) {
    let cases = JSON.parse(localStorage.getItem('casesData') || '[]');
    cases.push(caseData);
    localStorage.setItem('casesData', JSON.stringify(cases));
}

function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = "status " + type;
    setTimeout(() => {
        statusMessage.textContent = "";
        statusMessage.className = "status";
    }, 3000);
}
