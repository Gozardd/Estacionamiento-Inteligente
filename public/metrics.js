// metrics.js - Lógica para el gráfico y la descarga de CSV

document.addEventListener('DOMContentLoaded', () => {

    // === VARIABLES GLOBALES PARA MÉTRICAS ===
    let metricsSpotsData = null;
    let occupancyChart = null;
    let occupancyHistory = [];
    const MAX_HISTORY_POINTS = 60;
    let lastKnownEfficiency = -1; // Novedad: Para evitar guardar datos duplicados

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
        // Novedad: Referencia a la nueva ruta para el historial persistente
        const historyRef = database.ref('occupancy_history');

        // Modificado: Este listener ahora solo se encarga de GUARDAR el nuevo historial
        parkingSpotsRef.on('value', (snapshot) => {
            metricsSpotsData = snapshot.val();
            if (metricsSpotsData) {
                const stats = calculateMetricsStats(metricsSpotsData);
                // Solo guardamos un nuevo punto si la tasa de eficiencia ha cambiado
                if (stats.efficiency !== lastKnownEfficiency) {
                    lastKnownEfficiency = stats.efficiency;
                    const now = new Date();
                    // Guardamos el nuevo punto en la base de datos de Firebase
                    historyRef.push({
                        rate: stats.efficiency,
                        time: now.toISOString() // Usamos formato ISO para consistencia
                    });
                }
            }
        }, (error) => {
            console.error("Error al leer parking_spots:", error);
        });

        // Novedad: Un nuevo listener que se encarga de LEER el historial y ACTUALIZAR el gráfico
        // Usamos limitToLast para obtener solo los últimos N puntos y ser eficientes
        historyRef.limitToLast(MAX_HISTORY_POINTS).on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Convertimos el objeto de Firebase a un array ordenado
                occupancyHistory = Object.keys(data).map(key => ({
                    time: new Date(data[key].time),
                    rate: data[key].rate
                }));
                
                // Si el gráfico no existe, lo inicializamos. Si ya existe, lo actualizamos.
                if (!occupancyChart) {
                    initializeChart();
                }
                updateChartDisplay();
            } else {
                // Si no hay historial en la BD, igual inicializamos el gráfico vacío
                initializeChart();
            }
        }, (error) => {
            console.error("Error al leer occupancy_history:", error);
        });

    } else {
        console.error("Firebase no está inicializado.");
    }

    // === FUNCIONES DE GRÁFICOS Y DESCARGA ===

    function initializeChart() {
        const ctx = document.getElementById('occupancy-chart');
        if (!ctx || occupancyChart) return; // Evitar reinicializar
        
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
                    y: { min: 0, max: 100, ticks: { color: '#b8c5d6' } },
                    x: { ticks: { color: '#b8c5d6' } }
                },
                plugins: {
                    legend: { labels: { color: '#ffffff' } }
                }
            }
        });
    }

    // Novedad: Función dedicada a actualizar los datos del gráfico
    function updateChartDisplay() {
        if (!occupancyChart) return;

        occupancyChart.data.labels = occupancyHistory.map(p => p.time.toLocaleTimeString('es-ES'));
        occupancyChart.data.datasets[0].data = occupancyHistory.map(p => p.rate);
        occupancyChart.update('none');
    }

    // ... (El resto de tus funciones de descarga CSV permanecen igual)
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

    // --- INICIALIZACIÓN DE BOTONES ---
    const downloadStatusBtn = document.getElementById('download-status-csv');
    const downloadHistoryBtn = document.getElementById('download-history-csv');

    if (downloadStatusBtn) {
        downloadStatusBtn.addEventListener('click', downloadCurrentStateCSV);
    }
    if (downloadHistoryBtn) {
        downloadHistoryBtn.addEventListener('click', downloadHistoryCSV);
    }
    
    // Ya no inicializamos el gráfico aquí, se hace cuando llegan los datos del historial
});