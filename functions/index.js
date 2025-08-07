// functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// Esta función se ejecutará automáticamente cada 15 minutos.
exports.recordOccupancyHistory = functions.pubsub
  .schedule("every 15 minutes")
  .onRun(async (context) => {
    console.log("Ejecutando la tarea programada de historial de ocupación.");

    const db = admin.database();
    const spotsRef = db.ref("parking_spots");
    const historyRef = db.ref("occupancy_history");

    try {
      // 1. Leer el estado actual de los espacios
      const snapshot = await spotsRef.once("value");
      const spotsData = snapshot.val();

      if (!spotsData) {
        console.log("No hay datos de estacionamiento, no se guarda historial.");
        return null;
      }

      // 2. Calcular la tasa de ocupación
      let total = 0;
      let occupied = 0;
      for (const spotId in spotsData) {
        total++;
        if (spotsData[spotId].status === "Ocupado") {
          occupied++;
        }
      }
      const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

      // 3. Guardar el nuevo registro en el historial
      const timestamp = Date.now();
      await historyRef.push({
        timestamp: timestamp,
        occupancy_rate: occupancyRate,
      });

      console.log(`Historial guardado: ${occupancyRate}% de ocupación.`);
      return null;
    } catch (error) {
      console.error("Error al registrar el historial de ocupación:", error);
      return null;
    }
  });