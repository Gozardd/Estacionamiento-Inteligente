// notifications.js - Sistema de notificaciones en tiempo real para SmartPark Pro

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.container = null;

        this.init();
    }

    init() {
        // Crear contenedor de notificaciones
        this.container = document.createElement('div');
        this.container.className = 'notifications-container';
        this.container.innerHTML = `
            <div class="notifications-header">
                <h3><i class="fas fa-bell"></i> Notificaciones</h3>
                <button class="clear-all-btn" onclick="notificationManager.clearAll()">
                    <i class="fas fa-trash"></i> Limpiar
                </button>
            </div>
            <div class="notifications-list" id="notifications-list"></div>
        `;
        document.body.appendChild(this.container);

        // Agregar estilos
        this.addStyles();

        // Agregar botón de toggle al header
        this.addToggleButton();
    }

    addStyles() {
        const styles = `
            .notifications-container {
                position: fixed;
                top: 100px;
                right: -350px;
                width: 320px;
                max-height: 500px;
                background: var(--bg-card);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: var(--border-radius);
                box-shadow: var(--shadow-heavy);
                z-index: 1000;
                transition: right 0.3s ease;
                overflow: hidden;
            }

            .notifications-container.active {
                right: 20px;
            }

            .notifications-header {
                padding: 1rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: var(--primary-gradient);
            }

            .notifications-header h3 {
                color: white;
                font-size: 1rem;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .clear-all-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                padding: 0.5rem 0.8rem;
                border-radius: 6px;
                color: white;
                font-size: 0.8rem;
                cursor: pointer;
                transition: background 0.2s;
            }

            .clear-all-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .notifications-list {
                max-height: 400px;
                overflow-y: auto;
                padding: 0.5rem;
            }

            .notification-item {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 0.5rem;
                position: relative;
                animation: slideInRight 0.3s ease;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .notification-item:hover {
                background: rgba(255, 255, 255, 0.08);
                transform: translateX(-5px);
            }

            .notification-item.info {
                border-left: 4px solid #667eea;
            }

            .notification-item.warning {
                border-left: 4px solid #ffd700;
            }

            .notification-item.success {
                border-left: 4px solid #00ff88;
            }

            .notification-item.error {
                border-left: 4px solid #ff6b6b;
            }

            .notification-header {
                display: flex;
                justify-content: space-between;
                align-items: start;
                margin-bottom: 0.5rem;
            }

            .notification-title {
                font-weight: 600;
                color: var(--text-primary);
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .notification-time {
                font-size: 0.7rem;
                color: var(--text-muted);
            }

            .notification-message {
                color: var(--text-secondary);
                font-size: 0.8rem;
                line-height: 1.4;
            }

            .notification-close {
                position: absolute;
                top: 0.5rem;
                right: 0.5rem;
                background: none;
                border: none;
                color: var(--text-muted);
                cursor: pointer;
                font-size: 0.8rem;
                opacity: 0;
                transition: opacity 0.2s;
            }

            .notification-item:hover .notification-close {
                opacity: 1;
            }

            .notification-close:hover {
                color: var(--text-primary);
            }

            .notifications-toggle {
                position: relative;
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.1);
                padding: 0.7rem;
                border-radius: var(--border-radius-small);
                color: var(--text-secondary);
                cursor: pointer;
                transition: var(--transition-medium);
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .notifications-toggle:hover {
                background: rgba(255, 255, 255, 0.05);
                color: var(--text-primary);
            }

            .notification-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #ff6b6b;
                color: white;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                font-size: 0.7rem;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                animation: pulse 2s infinite;
            }

            .toast-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--bg-card);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: var(--border-radius);
                padding: 1rem;
                min-width: 300px;
                max-width: 400px;
                z-index: 1001;
                animation: slideInFromTop 0.3s ease;
                box-shadow: var(--shadow-heavy);
            }

            .no-notifications {
                text-align: center;
                padding: 2rem;
                color: var(--text-muted);
            }

            .no-notifications i {
                font-size: 2rem;
                margin-bottom: 1rem;
                display: block;
            }

            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            @keyframes slideInFromTop {
                from { transform: translateY(-100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }

            @media (max-width: 768px) {
                .notifications-container {
                    right: -100%;
                    width: 90%;
                    max-width: 320px;
                }

                .notifications-container.active {
                    right: 5%;
                }

                .toast-notification {
                    right: 5%;
                    left: 5%;
                    min-width: auto;
                }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    addToggleButton() {
        const headerControls = document.querySelector('.header-controls');
        if (headerControls) {
            const toggleButton = document.createElement('button');
            toggleButton.className = 'notifications-toggle';
            toggleButton.innerHTML = `
                <i class="fas fa-bell"></i>
                <span class="notification-badge" id="notification-badge" style="display: none;">0</span>
            `;
            toggleButton.addEventListener('click', () => this.toggle());
            headerControls.insertBefore(toggleButton, headerControls.firstChild);
        }
    }

    toggle() {
        this.container.classList.toggle('active');
    }

    show() {
        this.container.classList.add('active');
    }

    hide() {
        this.container.classList.remove('active');
    }

    addNotification(title, message, type = 'info', showToast = true) {
        const notification = {
            id: Date.now(),
            title,
            message,
            type,
            timestamp: new Date()
        };

        this.notifications.unshift(notification);
        this.updateNotificationsList();
        this.updateBadge();

        if (showToast) {
            this.showToast(notification);
        }

        // Auto-remove después de 10 segundos si es info
        if (type === 'info') {
            setTimeout(() => {
                this.removeNotification(notification.id);
            }, 10000);
        }

        return notification.id;
    }

    updateNotificationsList() {
        const list = document.getElementById('notifications-list');
        if (!list) return;

        list.innerHTML = '';

        if (this.notifications.length === 0) {
            list.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>No hay notificaciones</p>
                </div>
            `;
            return;
        }

        this.notifications.forEach(notification => {
            const item = this.createNotificationElement(notification);
            list.appendChild(item);
        });
    }

    createNotificationElement(notification) {
        const div = document.createElement('div');
        div.className = `notification-item ${notification.type}`;
        div.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">
                    ${this.getIcon(notification.type)}
                    ${notification.title}
                </div>
                <div class="notification-time">
                    ${this.formatTime(notification.timestamp)}
                </div>
            </div>
            <div class="notification-message">${notification.message}</div>
            <button class="notification-close" onclick="notificationManager.removeNotification(${notification.id})">
                <i class="fas fa-times"></i>
            </button>
        `;

        div.addEventListener('click', () => {
            this.removeNotification(notification.id);
        });

        return div;
    }

    getIcon(type) {
        const icons = {
            info: '<i class="fas fa-info-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-times-circle"></i>'
        };
        return icons[type] || icons.info;
    }

    formatTime(timestamp) {
        const now = new Date();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'Ahora';
        if (minutes < 60) return `${minutes}m`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
        return timestamp.toLocaleDateString();
    }

    showToast(notification) {
        const toast = document.createElement('div');
        toast.className = `toast-notification ${notification.type}`;
        toast.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">
                    ${this.getIcon(notification.type)}
                    ${notification.title}
                </div>
            </div>
            <div class="notification-message">${notification.message}</div>
        `;

        document.body.appendChild(toast);

        // Auto-remove después de 4 segundos
        setTimeout(() => {
            toast.style.animation = 'slideInFromTop 0.3s ease reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 4000);

        // Click para cerrar
        toast.addEventListener('click', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }

    removeNotification(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.updateNotificationsList();
        this.updateBadge();
    }

    clearAll() {
        this.notifications = [];
        this.updateNotificationsList();
        this.updateBadge();
    }

    updateBadge() {
        const badge = document.getElementById('notification-badge');
        if (badge) {
            const count = this.notifications.length;
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }



    // Métodos específicos para el sistema de parking
    notifySpotStatusChange(spotId, newStatus, oldStatus) {
        const title = newStatus === 'Ocupado' ? 'Espacio Ocupado' : 'Espacio Liberado';
        const message = `${spotId}: cambió de "${oldStatus}" a "${newStatus}"`;
        const type = newStatus === 'Ocupado' ? 'warning' : 'success';
        
        this.addNotification(title, message, type, false);
    }

    notifyImpactDetected(spotId) {
        const title = 'Impacto Detectado';
        const message = `Se detectó un impacto en ${spotId}. Revisar estado del vehículo.`;
        
        this.addNotification(title, message, 'error', true);
    }



    notifyConnectionLost() {
        const title = 'Conexión Perdida';
        const message = 'Se perdió la conexión con Firebase. Intentando reconectar...';
        
        this.addNotification(title, message, 'error', true);
    }

    notifyConnectionRestored() {
        const title = 'Conexión Restaurada';
        const message = 'La conexión con Firebase ha sido restaurada.';
        
        this.addNotification(title, message, 'success', true);
    }


}

// Inicializar el sistema de notificaciones
let notificationManager;

// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    notificationManager = new NotificationManager();
    
    // Ejemplo de uso - puedes quitar esto en producción
    setTimeout(() => {
        notificationManager.addNotification(
            'Sistema Iniciado',
            'SmartPark Pro está funcionando correctamente.',
            'success'
        );
    }, 2000);
});

// Integración con Firebase - Agregar al final de script.js
if (typeof firebase !== 'undefined') {
    // Monitorear cambios de estado de los espacios
    let previousSpotStates = {};
    
    const enhancedParkingSpotsRef = firebase.database().ref('parking_spots');
    enhancedParkingSpotsRef.on('value', (snapshot) => {
        const spotsData = snapshot.val();
        
        if (spotsData && notificationManager) {
            // Detectar cambios de estado
            for (const spotId in spotsData) {
                const currentState = spotsData[spotId];
                const previousState = previousSpotStates[spotId];
                
                if (previousState && previousState.status !== currentState.status) {
                    notificationManager.notifySpotStatusChange(
                        spotId.replace('_', ' '),
                        currentState.status,
                        previousState.status
                    );
                }
                
                // Detectar impactos
                if (currentState.impact_detected && 
                    (!previousState || !previousState.impact_detected)) {
                    notificationManager.notifyImpactDetected(spotId.replace('_', ' '));
                }
            }
            
            // Verificar ocupación - ELIMINADO, ya no se envían notificaciones de ocupación
            // const stats = calculateStats(spotsData);
            // notificationManager.notifyHighOccupancy(Math.round(stats.efficiency));
            
            previousSpotStates = JSON.parse(JSON.stringify(spotsData));
        }
    });
    
    // Monitorear estado de conexión
    const connectedRef = firebase.database().ref('.info/connected');
    connectedRef.on('value', (snapshot) => {
        if (notificationManager) {
            if (snapshot.val() === true) {
                // Solo notificar reconexión si previamente se había perdido
                if (window.wasDisconnected) {
                    notificationManager.notifyConnectionRestored();
                    window.wasDisconnected = false;
                }
            } else {
                notificationManager.notifyConnectionLost();
                window.wasDisconnected = true;
            }
        }
    });
}

// Funciones de utilidad para testing y debugging
// Puedes usar estas funciones en la consola del navegador:

// notificationManager.addNotification('Prueba', 'Mensaje de prueba', 'info') - Crear notificación de prueba