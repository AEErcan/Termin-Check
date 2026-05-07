// index.js - Haupteinstiegspunkt der Anwendung
import cron from 'node-cron';
import dotenv from 'dotenv';
import { logger } from './logger.js';
import { checkForAppointments, filterUpcomingAppointments, cleanup } from './checker.js';
import { notifyNewAppointments, sendStatusNotification } from './notifier.js';
import {
  compareAppointments,
  updateAppointments,
  recordError,
  resetErrorCount,
} from './storage.js';

// Lade Umgebungsvariablen
dotenv.config();

/**
 * Validiert erforderliche Umgebungsvariablen
 */
const validateEnvironment = () => {
  const required = ['TARGET_URL', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error('Erforderliche Umgebungsvariablen fehlen', { missing });
    throw new Error(`Erforderliche Env-Variablen fehlen: ${missing.join(', ')}`);
  }

  logger.info('Umgebungsvariablen validiert');
};

/**
 * Hauptprüf-Funktion
 */
const runCheck = async () => {
  try {
    logger.info('═'.repeat(60));
    logger.info('Starte Termin-Prüfung...');

    // Prüfe Webseite
    const result = await checkForAppointments(process.env.TARGET_URL);

    if (!result.success) {
      const errorCount = recordError();
      logger.error(`Prüfung fehlgeschlagen (Fehler #${errorCount})`);

      if (errorCount === 3) {
        await sendStatusNotification('⚠️ Mehrere Fehler bei Termin-Prüfung', true);
      }

      return;
    }

    // Erst vergleichen, dann speichern – sonst vergleicht man immer mit sich selbst
    const comparison = compareAppointments(result.appointments);
    updateAppointments(result.appointments);

    if (comparison.newAppointments.length > 0) {
      const upcoming = filterUpcomingAppointments(comparison.newAppointments);
      logger.info('Neue Termine gefunden!', {
        total: comparison.newAppointments.length,
        within7days: upcoming.length,
      });

      if (upcoming.length === 0) {
        logger.info('Keine Termine innerhalb der nächsten 7 Tage – keine Benachrichtigung');
      }

      // Sende Benachrichtigungen nur für Termine innerhalb von 7 Tagen
      const notified = await notifyNewAppointments(upcoming);

      if (notified) {
        logger.info('Benutzer benachrichtigt');
      }
    } else if (comparison.removedAppointments.length > 0) {
      logger.info('Termine wurden freigegeben', {
        count: comparison.removedAppointments.length,
      });
    } else {
      logger.info('Keine Änderungen erkannt');
    }

    if (resetErrorCount()) {
      logger.info('Error-Counter zurückgesetzt');
    }

    logger.info('═'.repeat(60));
  } catch (error) {
    logger.error('Unerwarteter Fehler in Prüfungs-Loop', { error: error.message });
    recordError();
  }
};

/**
 * Graceful Shutdown
 */
const gracefulShutdown = async () => {
  logger.info('Fahre Anwendung herunter...');
  await cleanup();
  logger.info('Anwendung beendet');
  process.exit(0);
};

/**
 * Starte die Anwendung
 */
const start = async () => {
  try {
    logger.info('╔════════════════════════════════════════════════════════════╗');
    logger.info('║        Termine-Monitor - Appointment Monitoring Service    ║');
    logger.info('╚════════════════════════════════════════════════════════════╝');

    // Validiere Konfiguration
    validateEnvironment();

    const checkInterval = process.env.CHECK_INTERVAL || '*/10 * * * *'; // Default: alle 10 Minuten
    const isDev = process.env.NODE_ENV === 'development';

    logger.info('Anwendung wird gestartet', {
      targetUrl: process.env.TARGET_URL.substring(0, 50) + '...',
      checkInterval,
      isDev,
    });

    // Führe initiale Prüfung aus
    logger.info('Führe initiale Termin-Prüfung durch...');
    await runCheck();

    // Richte Cron-Job ein
    const task = cron.schedule(checkInterval, async () => {
      await runCheck();
    });

    logger.info(`✅ Scheduler aktiviert`, { checkInterval });
    logger.info('Die Anwendung läuft. Drücke Strg+C zum Beenden.');

    // Signale für sauberes Beenden
    process.on('SIGINT', async () => {
      logger.info('SIGINT empfangen');
      task.stop();
      await gracefulShutdown();
    });

    process.on('SIGTERM', async () => {
      logger.info('SIGTERM empfangen');
      task.stop();
      await gracefulShutdown();
    });

    // Error-Handler
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unbehandelte Promise-Rejection', {
        reason: String(reason),
        promise: String(promise),
      });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Unerwarteter Fehler', { error: error.message, stack: error.stack });
      gracefulShutdown();
    });
  } catch (error) {
    logger.error('Fehler beim Starten der Anwendung', { error: error.message });
    process.exit(1);
  }
};

// Starte die Anwendung
start().catch((error) => {
  logger.error('Kritischer Fehler', { error: error.message });
  process.exit(1);
});
