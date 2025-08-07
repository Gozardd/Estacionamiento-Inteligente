// Configuración de Firebase con tus credenciales
const firebaseConfig = {

    apiKey: "AIzaSyAkdLEbIgCMcMWXdTfoysWqTyMyhTM8dHk",
    authDomain: "estacionamiento-intelige-f32db.firebaseapp.com",
    databaseURL: "https://estacionamiento-intelige-f32db-default-rtdb.firebaseio.com",
    projectId: "estacionamiento-intelige-f32db",
    storageBucket: "estacionamiento-intelige-f32db.firebasestorage.app",
    messagingSenderId: "39502497188",
    appId: "1:39502497188:web:2984841d788fd40be0ad31",
    measurementId: "G-T9FM71K8CJ"
};



// Inicializar la aplicación de Firebase
firebase.initializeApp(firebaseConfig);

// === VARIABLES GLOBALES ===
let currentStats = {
    total: 0,
    occupied: 0,
    available: 0,
    efficiency: 0
};

// === FUNCIONES UTILITARIAS ===
function formatDateTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function updateLastUpdateTime() {
    const lastUpdateElement = document.getElementById('last-update-time');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = new Date().toLocaleTimeString('es-ES');
    }
}

function calculateStats(spotsData) {
    const stats = {
        total: 0,
        occupied: 0,
        available: 0,
        efficiency: 0
    };

    if (spotsData) {
        for (const spotId in spotsData) {
            stats.total++;
            if (spotsData[spotId].status === 'Ocupado') {
                stats.occupied++;
            } else {
                stats.available++;
            }
        }
        stats.efficiency = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0;
    }

    return stats;
}

function updateStatsDisplay(stats) {
    const elements = {
        total: document.getElementById('total-count'),
        occupied: document.getElementById('occupied-count'),
        available: document.getElementById('available-count'),
        efficiency: document.getElementById('efficiency-rate')
    };

    // Animación de conteo
    Object.keys(elements).forEach(key => {
        if (elements[key]) {
            const target = key === 'efficiency' ? stats[key] + '%' : stats[key];
            animateCounter(elements[key], currentStats[key], stats[key], key === 'efficiency');
        }
    });

    currentStats = { ...stats };
}

function animateCounter(element, from, to, isPercentage = false) {
    const duration = 800;
    const steps = 30;
    const stepTime = duration / steps;
    const difference = to - from;
    const increment = difference / steps;
    
    let current = from;
    let step = 0;

    const timer = setInterval(() => {
        current += increment;
        step++;
        
        const value = step === steps ? to : Math.round(current);
        element.textContent = isPercentage ? value + '%' : value;
        
        if (step >= steps) {
            clearInterval(timer);
        }
    }, stepTime);
}

function addIconToDataLabel(label) {
    const icons = {
        'Distancia': 'fas fa-ruler',
        'Luz Ambiental': 'fas fa-sun',
        'Nivel de Vibración': 'fas fa-wave-square',
        'Impacto Detectado': 'fas fa-exclamation-triangle'
    };
    
    const icon = icons[label] || 'fas fa-info-circle';
    return `<i class="${icon}"></i> ${label}`;
}

function createLoadingSpinner() {
    return `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Cargando datos del estacionamiento...</p>
        </div>
    `;
}

// === LÓGICA PARA LA PÁGINA DE LOGIN ===
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('login-error');
        const submitButton = loginForm.querySelector('button[type="submit"]');
        
        // Mostrar estado de carga
        submitButton.classList.add('loading');
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        errorMessage.textContent = '';

        firebase.auth().signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Login exitoso
                submitButton.innerHTML = '<i class="fas fa-check"></i> ¡Acceso concedido!';
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            })
            .catch((error) => {
                // Error de login
                submitButton.classList.remove('loading');
                submitButton.innerHTML = '<span class="button-text">Acceder al Sistema</span><i class="fas fa-arrow-right button-icon"></i>';
                
                let errorText = 'Error de autenticación';
                switch (error.code) {
                    case 'auth/user-not-found':
                        errorText = 'Usuario no encontrado';
                        break;
                    case 'auth/wrong-password':
                        errorText = 'Contraseña incorrecta';
                        break;
                    case 'auth/too-many-requests':
                        errorText = 'Demasiados intentos. Intenta más tarde';
                        break;
                    case 'auth/network-request-failed':
                        errorText = 'Error de conexión';
                        break;
                    default:
                        errorText = 'Correo o contraseña incorrectos';
                }
                
                errorMessage.textContent = errorText;
                
                // Shake animation for error
                loginForm.style.animation = 'shake 0.5s ease-in-out';
                setTimeout(() => {
                    loginForm.style.animation = '';
                }, 500);
            });
    });

    // Efecto de shake para errores
    const shakeKeyframes = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
    `;
    
    const style = document.createElement('style');
    style.textContent = shakeKeyframes;
    document.head.appendChild(style);
}

// === LÓGICA PARA EL PANEL DE CONTROL ===
const parkingLotContainer = document.getElementById('parking-lot-container');
if (parkingLotContainer) {
    const auth = firebase.auth();
    const database = firebase.database();
    const parkingSpotsRef = database.ref('parking_spots');
    const logoutButton = document.getElementById('logout-button');

    // Mostrar loading inicial
    parkingLotContainer.innerHTML = createLoadingSpinner();

    // Escuchar cambios en el estado de autenticación
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("Usuario autenticado. Cargando datos...");
            loadParkingData();
            
            // Inicializar actualización de tiempo
            updateLastUpdateTime();
            setInterval(updateLastUpdateTime, 1000);
        } else {
            console.log("Usuario no autenticado. Redirigiendo...");
            window.location.href = 'login.html';
        }
    });

    // Función para cargar y mostrar los datos del estacionamiento
    function loadParkingData() {
        parkingSpotsRef.on('value', (snapshot) => {
            const spotsData = snapshot.val();
            
            // Calcular y actualizar estadísticas
            const stats = calculateStats(spotsData);
            updateStatsDisplay(stats);
            
            // Limpiar contenedor
            parkingLotContainer.innerHTML = '';

            if (spotsData) {
                // Ordenar spots por ID para consistencia visual
                const sortedSpots = Object.keys(spotsData).sort().map(id => ({
                    id,
                    data: spotsData[id]
                }));

                sortedSpots.forEach(({ id, data }, index) => {
                    setTimeout(() => {
                        createParkingSpotCard(id, data);
                    }, index * 100); // Animación escalonada
                });
            } else {
                parkingLotContainer.innerHTML = `
                    <div class="no-data-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <h3>No hay datos disponibles</h3>
                        <p>No se encontraron datos de estacionamiento en la base de datos.</p>
                    </div>
                `;
            }
        }, (error) => {
            console.error("Error al cargar datos:", error);
            parkingLotContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error de conexión</h3>
                    <p>No se pudieron cargar los datos. Verifica tu conexión.</p>
                    <button onclick="location.reload()" class="retry-button">
                        <i class="fas fa-refresh"></i> Reintentar
                    </button>
                </div>
            `;
        });
    }

    // Función mejorada para crear las tarjetas de estacionamiento
    function createParkingSpotCard(id, data) {
        const statusClass = data.status === 'Ocupado' ? 'occupied' : 'free';
        const borderClass = data.status === 'Ocupado' ? 'occupied-border' : 'free-border';
        const impactClass = data.impact_detected ? 'impact' : '';
        const lastUpdate = formatDateTime(data.last_update);
        
        // Formatear valores
        const distance = typeof data.distance_cm === 'number' ? data.distance_cm.toFixed(1) : 'N/A';
        const lightLevel = typeof data.light_lux === 'number' ? data.light_lux.toFixed(1) : 'N/A';
        const vibration = data.vibration_level || 'N/A';
        const impact = data.impact_detected ? 'SÍ' : 'NO';
        
        // Determinar el icono del estado
        const statusIcon = data.status === 'Ocupado' ? 'fas fa-car' : 'fas fa-check-circle';
        
        const spotElement = document.createElement('div');
        spotElement.className = `parking-spot ${borderClass} ${impactClass}`;
        spotElement.innerHTML = `
            <div class="spot-header">
                <span class="spot-id">${id.replace('_', ' ')}</span>
                <span class="spot-status ${statusClass}">
                    <i class="${statusIcon}"></i>
                    ${data.status}
                </span>
            </div>
            <div class="spot-data">
                <div class="data-item">
                    <span class="data-label">${addIconToDataLabel('Distancia')}</span>
                    <span class="data-value">${distance} cm</span>
                </div>
                <div class="data-item">
                    <span class="data-label">${addIconToDataLabel('Luz Ambiental')}</span>
                    <span class="data-value">${lightLevel} Lux</span>
                </div>
                <div class="data-item">
                    <span class="data-label">${addIconToDataLabel('Nivel de Vibración')}</span>
                    <span class="data-value">${vibration}</span>
                </div>
                <div class="data-item ${data.impact_detected ? 'impact-warning' : ''}">
                    <span class="data-label">${addIconToDataLabel('Impacto Detectado')}</span>
                    <span class="data-value ${data.impact_detected ? 'text-warning' : ''}">${impact}</span>
                </div>
            </div>
            <div class="spot-footer">
                <i class="fas fa-clock"></i>
                Última actualización: ${lastUpdate}
            </div>
        `;
        
        // Agregar efecto de entrada
        spotElement.style.opacity = '0';
        spotElement.style.transform = 'translateY(20px)';
        
        parkingLotContainer.appendChild(spotElement);
        
        // Animar entrada
        setTimeout(() => {
            spotElement.style.transition = 'all 0.5s ease-out';
            spotElement.style.opacity = '1';
            spotElement.style.transform = 'translateY(0)';
        }, 10);
    }

    // Funcionalidad mejorada del botón de cerrar sesión
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            logoutButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cerrando...';
            logoutButton.disabled = true;
            
            auth.signOut().then(() => {
                console.log("Cierre de sesión exitoso.");
                // La redirección se maneja automáticamente por onAuthStateChanged
            }).catch((error) => {
                console.error("Error al cerrar sesión:", error);
                logoutButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> <span>Cerrar Sesión</span>';
                logoutButton.disabled = false;
                
                // Mostrar mensaje de error
                alert('Error al cerrar sesión. Por favor, intenta de nuevo.');
            });
        });
    }
}

// === FUNCIONES GLOBALES ===
window.addEventListener('load', () => {
    // Ocultar spinner de carga si existe
    const loadingElements = document.querySelectorAll('.loading-container');
    loadingElements.forEach(element => {
        element.style.opacity = '0';
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 300);
    });
});

// Manejar errores de red
window.addEventListener('online', () => {
    console.log('Conexión restaurada');
    // Mostrar notificación de conexión restaurada si es necesario
});

window.addEventListener('offline', () => {
    console.log('Conexión perdida');
    // Mostrar notificación de pérdida de conexión si es necesario
});

// === ESTILOS ADICIONALES PARA ELEMENTOS DINÁMICOS ===
const additionalStyles = `
    .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem;
        color: var(--text-secondary);
    }
    
    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(102, 126, 234, 0.3);
        border-top: 3px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
    }
    
    .no-data-message, .error-message {
        text-align: center;
        padding: 3rem;
        color: var(--text-secondary);
        grid-column: 1 / -1;
    }
    
    .no-data-message i, .error-message i {
        font-size: 3rem;
        margin-bottom: 1rem;
        color: var(--text-muted);
    }
    
    .no-data-message h3, .error-message h3 {
        font-size: 1.5rem;
        margin-bottom: 0.5rem;
        color: var(--text-primary);
    }
    
    .retry-button {
        margin-top: 1rem;
        padding: 0.8rem 1.5rem;
        background: var(--primary-gradient);
        border: none;
        border-radius: var(--border-radius-small);
        color: white;
        font-weight: 600;
        cursor: pointer;
        transition: var(--transition-medium);
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .retry-button:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-medium);
    }
    
    .impact-warning {
        background: rgba(255, 215, 0, 0.1) !important;
        border-color: rgba(255, 215, 0, 0.3) !important;
    }
    
    .text-warning {
        color: #ffd700 !important;
        font-weight: 700;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;

// Agregar estilos adicionales al documento
const styleElement = document.createElement('style');
styleElement.textContent = additionalStyles;
document.head.appendChild(styleElement);

