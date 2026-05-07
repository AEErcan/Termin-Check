// logger.js - Einfaches Logger-Utility mit Timestamps
import { writeFileSync, appendFileSync, existsSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOG_FILE = `${__dirname}/../logs/app.log`;

// Logs-Verzeichnis erstellen, falls nicht vorhanden
const logsDir = dirname(LOG_FILE);
if (!existsSync(logsDir)) {
  try {
    writeFileSync(LOG_FILE, '');
  } catch (e) {
    // Ignorieren, falls Verzeichnis existiert
  }
}

/**
 * Formatiert eine Log-Nachricht mit Timestamp
 * @param {string} level - Log-Level (INFO, ERROR, WARN, DEBUG)
 * @param {string} message - Log-Nachricht
 * @param {any} data - Zusätzliche Daten (optional)
 * @returns {string} Formatierte Nachricht
 */
const formatMessage = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  let msg = `[${timestamp}] [${level}] ${message}`;
  if (data) {
    msg += ` | ${JSON.stringify(data)}`;
  }
  return msg;
};

/**
 * Schreibt Log-Nachricht in Datei und Konsole
 * @param {string} message - Formatierte Nachricht
 */
const writeLog = (message) => {
  console.log(message);
  try {
    appendFileSync(LOG_FILE, message + '\n');
  } catch (e) {
    console.error('Fehler beim Schreiben der Log-Datei:', e.message);
  }
};

export const logger = {
  info: (message, data = null) => {
    writeLog(formatMessage('INFO', message, data));
  },
  error: (message, data = null) => {
    writeLog(formatMessage('ERROR', message, data));
  },
  warn: (message, data = null) => {
    writeLog(formatMessage('WARN', message, data));
  },
  debug: (message, data = null) => {
    if (process.env.DEBUG === 'true') {
      writeLog(formatMessage('DEBUG', message, data));
    }
  },
};
