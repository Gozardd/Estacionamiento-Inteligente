// metrics.js - Lógica para el gráfico y la descarga de CSV

document.addEventListener('DOMContentLoaded', () => {

    // === VARIABLES GLOBALES PARA MÉTRICAS ===
    let metricsSpotsData = null; // Almacenará los datos más recientes para el CSV
    let occupancyChart = null;   // Objeto del gráfico
    let occupancyHistory = [];   // Historial para el gráfico y CSV
    const MAX_HISTORY_POINTS = 60; // Máximo de puntos a mostrar en el gráfico

    // --- Funciones de ayuda (duplicadas para ser autocontenido) ---
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

    // --- Lógica de Firebase (independiente del script.js original) ---
    // Se asume que Firebase ya fue inicializado por el script.js
    // Verificamos que el objeto firebase exista para no causar errores. 
    if (typeof firebase !== 'undefined') {
        const database = firebase.database();
        const parkingSpotsRef = database.ref('parking_spots');

        // Escuchamos los cambios en los datos del estacionamiento
        parkingSpotsRef.on('value', (snapshot) => {
            metricsSpotsData = snapshot.val();
            if (metricsSpotsData) {
                const stats = calculateMetricsStats(metricsSpotsData);
                updateOccupancyHistory(stats.efficiency);
            }
        }, (error) => {
            console.error("Error desde metrics.js al cargar datos:", error);
        });
    } else {
        console.error("Firebase no está inicializado. Asegúrate de que script.js se carga primero.");
    }


    // === FUNCIONES DE GRÁFICOS Y DESCARGA ===

    function initializeChart() {
        const ctx = document.getElementById('occupancy-chart');
        if (!ctx) return;
        
        occupancyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Tasa de Ocupación (%)',
                    data: [],
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
                    y: { 
                        min: 0, 
                        max: 100,
                        ticks: { color: '#b8c5d6' } 
                    },
                    x: { 
                        ticks: { color: '#b8c5d6' } 
                    }
                },
                plugins: {
                    legend: { labels: { color: '#ffffff' } }
                }
            }
        });
    }

    function updateOccupancyHistory(newRate) {
        if (!occupancyChart) return;

        const now = new Date();
        occupancyHistory.push({ time: now, rate: newRate });
        
        if (occupancyHistory.length > MAX_HISTORY_POINTS) {
            occupancyHistory.shift(); // Elimina el punto más antiguo
        }
        
        occupancyChart.data.labels = occupancyHistory.map(p => p.time.toLocaleTimeString('es-ES'));
        occupancyChart.data.datasets[0].data = occupancyHistory.map(p => p.rate);
        occupancyChart.update('none'); // 'none' para evitar animación parpadeante
    }

    function downloadCSV(csvContent, filename) {
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // \uFEFF para BOM de UTF-8
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

    function downloadHistoryCSV() {
        if (occupancyHistory.length === 0) {
            alert("No hay historial de ocupación para descargar.");
            return;
        }
        let csv = 'Fecha y Hora,Tasa de Ocupacion (%)\n';
        
        occupancyHistory.forEach(point => {
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
    
    initializeChart();
});