// metrics.js - Lógica para el gráfico y la descarga de CSV (CON HISTORIAL PERSISTENTE)

document.addEventListener('DOMContentLoaded', () => {

    // === VARIABLES GLOBALES PARA MÉTRICAS ===
    let metricsSpotsData = null;    // Almacenará los datos más recientes para el CSV
    let occupancyChart = null;      // Objeto del gráfico
    // CAMBIADO: Ya no usaremos un historial local para el gráfico, se leerá directo de Firebase.
    let csvDownloadHistory = [];    // Historial SÍ se mantiene para la descarga del CSV de la sesión actual.
    const MAX_HISTORY_POINTS = 60;  // Máximo de puntos a LEER de Firebase para el gráfico

    // --- Funciones de ayuda ---
    const formatDateTimeForCSV = (timestamp) => {
        return new Date(timestamp).toLocaleString('es-ES', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    const calculateMetricsStats = (spotsData) => {
        const stats = { total: 0, occupied: 0, efficiency: 0 };
        if (spotsData) {
            for (const spotId in spotsData) {
                stats.total++;
                if (spotsData[spotId].status === 'Ocupado') {
                    stats.occupied++;
                }
            }
            stats.efficiency = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0;
        }
        return stats;
    };

    // --- Lógica de Firebase ---
    if (typeof firebase !== 'undefined') {
        const database = firebase.database();
        const parkingSpotsRef = database.ref('parking_spots');
        // NUEVO: Referencia a la nueva ubicación del historial en Firebase
        const historyRef = database.ref('occupancy_history');

        let lastKnownRate = -1; // Para no guardar datos si la tasa no ha cambiado

        // 1. ESCUCHAR CAMBIOS EN LOS PUESTOS PARA GUARDAR EL HISTORIAL
        parkingSpotsRef.on('value', (snapshot) => {
            metricsSpotsData = snapshot.val();
            if (metricsSpotsData) {
                const stats = calculateMetricsStats(metricsSpotsData);
                const newRate = stats.efficiency;

                // NUEVO: Guardar en Firebase solo si la tasa de ocupación cambia.
                if (newRate !== lastKnownRate) {
                    console.log(`Nueva tasa de ocupación: ${newRate}%. Guardando en historial.`);
                    historyRef.push({
                        rate: newRate,
                        timestamp: firebase.database.ServerValue.TIMESTAMP // Usa la hora del servidor, más precisa
                    });
                    lastKnownRate = newRate;
                }
            }
        }, (error) => {
            console.error("Error al cargar datos de los puestos:", error);
        });

        // 2. ESCUCHAR CAMBIOS EN EL HISTORIAL PARA ACTUALIZAR EL GRÁFICO
        // CAMBIADO: Leemos el historial de Firebase en lugar de manejarlo localmente
        historyRef.limitToLast(MAX_HISTORY_POINTS).on('value', (snapshot) => {
            if (!occupancyChart) return; // No hacer nada si el gráfico no está listo

            const historyData = snapshot.val();
            const labels = [];
            const dataPoints = [];
            csvDownloadHistory = []; // Limpiamos el historial para descarga CSV

            if (historyData) {
                for (const key in historyData) {
                    const record = historyData[key];
                    labels.push(new Date(record.timestamp).toLocaleTimeString('es-ES'));
                    dataPoints.push(record.rate);
                    // Llenamos también el historial para la descarga CSV
                    csvDownloadHistory.push({ time: record.timestamp, rate: record.rate });
                }
            }
            
            occupancyChart.data.labels = labels;
            occupancyChart.data.datasets[0].data = dataPoints;
            occupancyChart.update();
        }, (error) => {
            console.error("Error al cargar el historial de ocupación:", error);
        });

    } else {
        console.error("Firebase no está inicializado. Asegúrate de que script.js se carga primero.");
    }


    // === FUNCIONES DE GRÁFICOS Y DESCARGA (Lógica de descarga de historial ahora usa csvDownloadHistory) ===

    function initializeChart() {
        const ctx = document.getElementById('occupancy-chart');
        if (!ctx) return;
        
        occupancyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [], // Se llenarán con datos de Firebase
                datasets: [{
                    label: 'Tasa de Ocupación (%)',
                    data: [], // Se llenarán con datos de Firebase
                    borderColor: 'rgba(102, 126, 234, 1)',
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { min: 0, max: 100, ticks: { color: '#b8c5d6' } },
                    x: { ticks: { color: '#b8c5d6' } }
                },
                plugins: {
                    legend: { labels: { color: '#ffffff' } }
                }
            }
        });
    }

    // CAMBIADO: Esta función ya no es necesaria, la lógica se movió al listener de 'historyRef'.
    // function updateOccupancyHistory(newRate) { ... }

    function downloadCSV(csvContent, filename) {
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function downloadCurrentStateCSV() {
        if (!metricsSpotsData) {
            alert("Aún no hay datos para descargar.");
            return;
        }
        let csv = 'ID,Estado,Distancia (cm),Luz (Lux),Nivel Vibracion,Impacto Detectado,Ultima Actualizacion\n';
        
        for (const id in metricsSpotsData) {
            const spot = metricsSpotsData[id];
            const row = [
                `"${id}"`,
                `"${spot.status || 'N/A'}"`,
                spot.distance_cm || 'N/A',
                spot.light_lux || 'N/A',
                `"${spot.vibration_level || 'N/A'}"`,
                spot.impact_detected ? 'SI' : 'NO',
                `"${formatDateTimeForCSV(spot.last_update * 1000)}"`
            ].join(',');
            csv += row + '\n';
        }
        
        downloadCSV(csv, 'estado_actual_smartpark.csv');
    }

    // CAMBIADO: La función de descarga ahora usa la variable 'csvDownloadHistory'
    function downloadHistoryCSV() {
        if (csvDownloadHistory.length === 0) {
            alert("No hay historial de ocupación para descargar.");
            return;
        }
        let csv = 'Fecha y Hora,Tasa de Ocupacion (%)\n';
        
        csvDownloadHistory.forEach(point => {
            const row = [
                `"${formatDateTimeForCSV(point.time)}"`,
                point.rate
            ].join(',');
            csv += row + '\n';
        });

        downloadCSV(csv, 'historial_ocupacion_smartpark.csv');
    }

    // --- INICIALIZACIÓN ---
    const downloadStatusBtn = document.getElementById('download-status-csv');
    const downloadHistoryBtn = document.getElementById('download-history-csv');

    if (downloadStatusBtn) {
        downloadStatusBtn.addEventListener('click', downloadCurrentStateCSV);
    }
    if (downloadHistoryBtn) {
        downloadHistoryBtn.addEventListener('click', downloadHistoryCSV);
    }
    
    initializeChart(); // El gráfico se llenará cuando lleguen los datos de Firebase
});