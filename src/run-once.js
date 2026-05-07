// run-once.js - Einmaliger Check für GitHub Actions
import dotenv from 'dotenv';
import { logger } from './logger.js';
import { checkForAppointments, filterUpcomingAppointments, cleanup } from './checker.js';
import { notifyNewAppointments, sendStatusNotification } from './notifier.js';
import {
  compareAppointments,
  updateAppointments,
  getErrorCount,
  recordError,
} from './storage.js';

dotenv.config();

const required = ['TARGET_URL', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Fehlende Umgebungsvariablen: ${missing.join(', ')}`);
  process.exit(1);
}

try {
  const result = await checkForAppointments(process.env.TARGET_URL);

  if (!result.success) {
    recordError();
    if (getErrorCount() >= 3) {
      await sendStatusNotification('Mehrere Fehler bei der Termin-Prüfung', true);
    }
    process.exit(1);
  }

  const comparison = compareAppointments(result.appointments);
  updateAppointments(result.appointments);

  if (comparison.newAppointments.length > 0) {
    const upcoming = filterUpcomingAppointments(comparison.newAppointments);
    logger.info('Neue Termine gefunden', {
      total: comparison.newAppointments.length,
      within7days: upcoming.length,
    });
    if (upcoming.length > 0) {
      await notifyNewAppointments(upcoming);
    }
  } else {
    logger.info('Keine Änderungen');
  }
} finally {
  await cleanup();
}
