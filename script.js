// Configuración - URL de tu proxy en Vercel
const API_URL = "https://atc-proxy.vercel.app/api/proxy";

// Variables globales
let cases = []; // Array para almacenar los casos activos
let userData = null;
let lastNotificationTime = 0; // Para rastrear la última vez que se mostró una notificación
const NOTIFICATION_INTERVAL = 30 * 60 * 1000; // 30 minutos en milisegundos

// Tareas por tipo de usuario
const ATC_TASKS = [
    "Consulta",
    "Incidencia",
    "Reclamo",
    "Seguimiento",
    "Gestión de Pedido",
    "Soporte Técnico",
    "Configuración",
    "Actualización",
    "Capacitación",
    "Revisión de Datos",
    "Otros"
];

const YUMAIRA_LUIS_TASKS = [
    "Reunión con prospecto",
    "Llamada de revisión",
    "Reunión con alianza gremial"
];

const ASAF_TASKS = [
    "Modificación o realización de presentación",
    "Elaboración de talonario de contingencia",
    "Post para Instagram",
    "Video para Instagram",
    "Post para LinkedIn",
    "Elaboración de plantilla de documentos fiscales"
];

const ALEJANDRO_TASKS = [
    "Crear Copys",
    "Editar Videos",
    "Publicar en redes sociales",
    "Planificar contenido",
    "Creación de material POP"
];

// Elementos DOM
const userSelect = document.getElementById('userSelect');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const currentUserSpan = document.getElementById('currentUser');
const timerContainer = document.querySelector('.timer-container');
const activeCasesContainer = document.getElementById('activeCases');
const caseType = document.getElementById('caseType');
const priority = document.getElementById('priority');
const caseNotes = document.getElementById('caseNotes');
const startNewCaseBtn = document.getElementById('startNewCaseBtn');
const statusMessage = document.getElementById('statusMessage');

// Eventos
loginBtn.addEventListener('click', selectUser);
logoutBtn.addEventListener('click', logout);
startNewCaseBtn.addEventListener('click', startNewCase);

// Iniciar el temporizador para notificaciones y actualización de tiempos
setInterval(() => {
    updateAllCaseTimers();
    checkForNotifications();
}, 1000); // Actualiza cada segundo

// Cargar usuarios y casos desde el proxy/localStorage al iniciar
window.onload = function() {
    // Mostrar el formulario de selección de usuario al inicio
    document.querySelector('.user-select').style.display = 'block';
    
    loadUsers();
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        userData = JSON.parse(savedUser);
        loadCasesFromStorage(); // Cargar casos activos desde localStorage
        showTimerInterface();
    }
};

// Cargar usuarios desde el proxy
function loadUsers() {
    fetch(`${API_URL}?action=getUsers`, {
        method: 'GET'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        const users = data.users;
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = JSON.stringify({ name: user[0], position: user[1] });
            option.textContent = `${user[0]} - ${user[1]}`;
            userSelect.appendChild(option);
        });
        // Guardamos los usuarios localmente como respaldo
        localStorage.setItem('localUsers', JSON.stringify(users));
    })
    .catch(error => {
        console.error("Error al cargar usuarios:", error);
        showStatus("No se pudieron cargar los usuarios. Usando datos locales.", "warning");
        fetchLocalUsers();
    });
}

// Respaldo local para usuarios
function fetchLocalUsers() {
    const localUsers = JSON.parse(localStorage.getItem('localUsers') || '[]');
    if (localUsers.length === 0) {
        showStatus("No hay usuarios disponibles sin conexión.", "error");
        return;
    }
    localUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = JSON.stringify({ name: user[0], position: user[1] });
        option.textContent = `${user[0]} - ${user[1]}`;
        userSelect.appendChild(option);
    });
}

// Cargar casos activos desde localStorage
function loadCasesFromStorage() {
    const savedCases = localStorage.getItem('activeCases');
    if (savedCases) {
        cases = JSON.parse(savedCases);
        // Restaurar el estado de los casos
        cases.forEach(caseObj => {
            if (caseObj.isRunning) {
                // No necesitamos setInterval, el tiempo se calcula dinámicamente
                caseObj.timer = null;
            }
        });
        renderActiveCases();
    }
}

// Guardar casos activos en localStorage
function saveCasesToStorage() {
    localStorage.setItem('activeCases', JSON.stringify(cases));
}

// Funciones
function selectUser() {
    if (userSelect.value) {
        userData = JSON.parse(userSelect.value);
        localStorage.setItem('currentUser', JSON.stringify(userData));
        loadCasesFromStorage(); // Cargar casos activos al iniciar sesión
        showTimerInterface();
        populateCaseTypes(); // Cargar las tareas según el usuario
    } else {
        showStatus("Por favor selecciona un usuario", "error");
    }
}

function populateCaseTypes() {
    // Limpiar las opciones actuales
    caseType.innerHTML = '<option value="">Seleccionar...</option>';

    // Determinar las tareas según el usuario
    let tasks = [];
    if (userData.name === "Yumaira Gómez") {
        tasks = [...YUMAIRA_LUIS_TASKS, ...ATC_TASKS]; // Yumaira tiene ambas listas
    } else if (userData.name === "Luis Silva") {
        tasks = YUMAIRA_LUIS_TASKS;
    } else if (userData.name === "Asaf Guevara") {
        tasks = ASAF_TASKS;
    } else if (userData.name === "Alejandro Palmese") {
        tasks = [...ALEJANDRO_TASKS, ...ATC_TASKS]; // Alejandro tiene sus tareas específicas más las de ATC
    } else {
        tasks = ATC_TASKS; // Tareas por defecto para otros usuarios
    }

    // Añadir las opciones al select
    tasks.forEach(task => {
        const option = document.createElement('option');
        option.value = task;
        option.textContent = task;
        caseType.appendChild(option);
    });
}

function logout() {
    if (cases.length > 0) {
        showStatus("No puedes cerrar sesión con casos activos", "error");
        return;
    }
    document.querySelector('.user-select').style.display = 'block';
    timerContainer.style.display = 'none';
    localStorage.removeItem('currentUser');
    localStorage.removeItem('activeCases'); // Limpiar casos al cerrar sesión
    userData = null;
    cases = [];
}

function showTimerInterface() {
    document.querySelector('.user-select').style.display = 'none';
    timerContainer.style.display = 'block';
    currentUserSpan.textContent = userData.name;
}

function startNewCase() {
    if (!caseType.value || !priority.value) {
        showStatus("Por favor selecciona el tipo de caso y la prioridad", "warning");
        return;
    }

    const caseId = Date.now(); // Usamos timestamp como ID único para cada caso
    const newCase = {
        id: caseId,
        type: caseType.value,
        priority: priority.value,
        notes: caseNotes.value,
        seconds: 0,
        minutes: 0,
        hours: 0,
        isRunning: false,
        startTime: null,
        pausedTime: 0,
        timer: null
    };

    cases.push(newCase);
    saveCasesToStorage(); // Guardar en localStorage
    renderActiveCases();

    // Iniciar el caso inmediatamente
    startCase(caseId);

    // Limpiar los campos para un nuevo caso
    caseType.value = "";
    priority.value = "";
    caseNotes.value = "";
}

function startCase(caseId) {
    const caseObj = cases.find(c => c.id === caseId);
    if (!caseObj.isRunning) {
        caseObj.startTime = new Date().getTime() - (caseObj.pausedTime * 1000);
        caseObj.isRunning = true;
        caseObj.timer = null; // No necesitamos setInterval, el tiempo se calcula dinámicamente
        saveCasesToStorage(); // Guardar en localStorage
        renderActiveCases();
        showStatus(`Caso ${caseObj.type} iniciado`, "success");
    }
}

function pauseCase(caseId) {
    const caseObj = cases.find(c => c.id === caseId);
    if (caseObj.isRunning) {
        // Calcular el tiempo transcurrido hasta ahora
        const now = new Date().getTime();
        const elapsed = Math.floor((now - caseObj.startTime) / 1000);
        caseObj.pausedTime = elapsed;
        caseObj.isRunning = false;
        caseObj.timer = null;
        saveCasesToStorage(); // Guardar en localStorage
        renderActiveCases();
        showStatus(`Caso ${caseObj.type} en pausa`, "warning");
    }
}

function stopCase(caseId) {
    const caseObj = cases.find(c => c.id === caseId);
    if (!caseObj.isRunning && caseObj.pausedTime === 0) {
        showStatus("No hay un caso activo para finalizar", "error");
        return;
    }

    const endTime = new Date();
    const startDateTime = new Date(caseObj.startTime);
    const duration = Math.floor((endTime.getTime() - caseObj.startTime) / 1000 / 60); // Duración en minutos

    const caseData = {
        user: userData.name,
        position: userData.position,
        date: formatDate(endTime),
        startTime: formatTime(startDateTime),
        endTime: formatTime(endTime),
        duration: duration,
        type: caseObj.type,
        priority: caseObj.priority,
        notes: caseObj.notes
    };

    saveCase(caseData);

    // Eliminar el caso de la lista de casos activos
    cases = cases.filter(c => c.id !== caseId);
    saveCasesToStorage(); // Guardar en localStorage
    renderActiveCases();
}

function updateAllCaseTimers() {
    cases.forEach(caseObj => {
        if (caseObj.isRunning) {
            const now = new Date().getTime();
            const elapsed = Math.floor((now - caseObj.startTime) / 1000);
            caseObj.hours = Math.floor(elapsed / 3600);
            caseObj.minutes = Math.floor((elapsed % 3600) / 60);
            caseObj.seconds = elapsed % 60;
        }
    });
    renderActiveCases();
}

function renderActiveCases() {
    activeCasesContainer.innerHTML = '';
    cases.forEach(caseObj => {
        const caseElement = document.createElement('div');
        caseElement.className = 'case';
        caseElement.style.display = 'flex';
        caseElement.style.justifyContent = 'space-between';
        caseElement.style.alignItems = 'center';
        caseElement.style.padding = '8px';
        caseElement.style.margin = '5px 0';
        caseElement.style.border = '1px solid #ccc';
        caseElement.style.borderRadius = '5px';
        caseElement.style.backgroundColor = '#f9f9f9';

        // Calcular el tiempo si el caso está pausado
        let displayHours = caseObj.hours;
        let displayMinutes = caseObj.minutes;
        let displaySeconds = caseObj.seconds;
        if (!caseObj.isRunning) {
            const elapsed = caseObj.pausedTime;
            displayHours = Math.floor(elapsed / 3600);
            displayMinutes = Math.floor((elapsed % 3600) / 60);
            displaySeconds = elapsed % 60;
        }

        const infoDiv = document.createElement('div');
        infoDiv.style.flex = '1';
        infoDiv.innerHTML = `
            <strong>${caseObj.type} - ${caseObj.priority}</strong>
            <div class="timer" style="font-size: 1.2em; margin-top: 5px;">
                ${(displayHours < 10 ? "0" + displayHours : displayHours)}:${(displayMinutes < 10 ? "0" + displayMinutes : displayMinutes)}:${(displaySeconds < 10 ? "0" + displaySeconds : displaySeconds)}
            </div>
            <div style="font-size: 0.9em; color: #555; margin-top: 3px;">
                Notas: ${caseObj.notes || 'Ninguna'}
            </div>
        `;

        const buttonsDiv = document.createElement('div');
        buttonsDiv.style.display = 'flex';
        buttonsDiv.style.gap = '5px';

        const toggleButton = document.createElement('button');
        toggleButton.textContent = caseObj.isRunning ? 'Pausar' : 'Reanudar';
        toggleButton.disabled = caseObj.isRunning ? false : false;
        toggleButton.onclick = () => caseObj.isRunning ? pauseCase(caseObj.id) : startCase(caseObj.id);
        toggleButton.style.padding = '5px 10px';
        toggleButton.style.fontSize = '0.9em';

        const stopButton = document.createElement('button');
        stopButton.textContent = 'Finalizar';
        stopButton.onclick = () => stopCase(caseObj.id);
        stopButton.style.padding = '5px 10px';
        stopButton.style.fontSize = '0.9em';

        buttonsDiv.appendChild(toggleButton);
        buttonsDiv.appendChild(stopButton);

        caseElement.appendChild(infoDiv);
        caseElement.appendChild(buttonsDiv);

        activeCasesContainer.appendChild(caseElement);
    });
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
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.result === "success") {
            showStatus("Caso finalizado y guardado correctamente", "success");
        } else {
            showStatus("Error al guardar: " + (data.error || "Desconocido"), "error");
            saveLocally(caseData);
        }
    })
    .catch(error => {
        console.error("Error al guardar caso:", error);
        showStatus("Error de conexión: " + error.message, "warning");
        saveLocally(caseData);
    });
}

function saveLocally(caseData) {
    let casesData = JSON.parse(localStorage.getItem('casesData') || '[]');
    casesData.push(caseData);
    localStorage.setItem('casesData', JSON.stringify(casesData));
}

function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = "status " + type;
    setTimeout(() => {
        statusMessage.textContent = "";
        statusMessage.className = "status";
    }, 3000);
}

// Notificaciones de escritorio cada 30 minutos
function checkForNotifications() {
    if (cases.length === 0) return; // No hay casos activos, no mostramos notificación

    const currentTime = Date.now();
    if (currentTime - lastNotificationTime >= NOTIFICATION_INTERVAL) {
        showNotification(`${cases.length} caso(s) activo(s). No olvides finalizarlos.`);
        lastNotificationTime = currentTime;
    }
}

function showNotification(message) {
    if (!("Notification" in window)) {
        console.log("Este navegador no soporta notificaciones de escritorio");
        return;
    }

    if (Notification.permission === "granted") {
        new Notification(message);
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification(message);
            }
        });
    }
}
