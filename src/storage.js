// storage.js - Verwaltet die Speicherung von Terminen und Zustand
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STORAGE_FILE = `${__dirname}/../storage.json`;

/**
 * Initialisiert die Storage-Datei, falls nicht vorhanden
 */
const initializeStorage = () => {
  if (!existsSync(STORAGE_FILE)) {
    const initialData = {
      lastUpdate: null,
      appointments: [],
      lastNotifications: [],
      errorCount: 0,
      successCount: 0,
    };
    writeFileSync(STORAGE_FILE, JSON.stringify(initialData, null, 2));
    logger.info('Storage-Datei erstellt');
  }
};

/**
 * Liest gespeicherte Daten aus der JSON-Datei
 * @returns {object} Gespeicherte Daten oder leeres Objekt
 */
export const getStorage = () => {
  try {
    initializeStorage();
    const data = readFileSync(STORAGE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Fehler beim Lesen der Storage-Datei', { error: error.message });
    return {
      lastUpdate: null,
      appointments: [],
      lastNotifications: [],
      errorCount: 0,
      successCount: 0,
    };
  }
};

/**
 * Speichert Daten in die JSON-Datei
 * @param {object} data - Zu speichernde Daten
 */
export const saveStorage = (data) => {
  try {
    writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
    logger.debug('Storage aktualisiert');
  } catch (error) {
    logger.error('Fehler beim Speichern der Storage-Datei', { error: error.message });
  }
};

/**
 * Vergleicht neue Termine mit gespeicherten und findet Unterschiede
 * @param {array} newAppointments - Neue Termine
 * @returns {object} { newAppointments: [], removedAppointments: [], allAppointments: [] }
 */
export const compareAppointments = (newAppointments) => {
  const storage = getStorage();
  const oldAppointments = storage.appointments || [];

  const normalize = (appts) =>
    appts.map((a) => `${a.date}|${a.time}|${a.location || ''}`);

  const oldSet = new Set(normalize(oldAppointments));
  const newSet = new Set(normalize(newAppointments));

  // Neue Termine (nicht in alt)
  const newAppts = newAppointments.filter(
    (a) => !oldSet.has(`${a.date}|${a.time}|${a.location || ''}`)
  );

  // Entfernte Termine (in alt aber nicht in neu)
  const removedAppts = oldAppointments.filter(
    (a) => !newSet.has(`${a.date}|${a.time}|${a.location || ''}`)
  );

  return {
    newAppointments: newAppts,
    removedAppointments: removedAppts,
    allAppointments: newAppointments,
  };
};

/**
 * Aktualisiert die Termine in der Storage
 * @param {array} appointments - Neue Termine
 */
export const updateAppointments = (appointments) => {
  const storage = getStorage();
  storage.appointments = appointments;
  storage.lastUpdate = new Date().toISOString();
  storage.successCount = (storage.successCount || 0) + 1;
  saveStorage(storage);
  logger.info('Termine aktualisiert', { count: appointments.length });
};

/**
 * Speichert eine Benachrichtigung um Duplikate zu vermeiden
 * @param {string} appointmentKey - Eindeutiger Schlüssel für Termin
 */
export const recordNotification = (appointmentKey) => {
  const storage = getStorage();
  if (!storage.lastNotifications) {
    storage.lastNotifications = [];
  }

  // Halte nur Benachrichtigungen der letzten 7 Tage
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  storage.lastNotifications = storage.lastNotifications.filter(
    (n) => new Date(n.timestamp).getTime() > weekAgo
  );

  storage.lastNotifications.push({
    appointmentKey,
    timestamp: new Date().toISOString(),
  });

  saveStorage(storage);
};

/**
 * Prüft ob für einen Termin bereits eine Benachrichtigung gesendet wurde
 * @param {string} appointmentKey - Eindeutiger Schlüssel für Termin
 * @returns {boolean} True wenn bereits benachrichtigt
 */
export const hasBeenNotified = (appointmentKey) => {
  const storage = getStorage();
  if (!storage.lastNotifications) {
    return false;
  }
  return storage.lastNotifications.some((n) => n.appointmentKey === appointmentKey);
};

/**
 * Erhöht Error-Counter
 */
export const recordError = () => {
  const storage = getStorage();
  storage.errorCount = (storage.errorCount || 0) + 1;
  saveStorage(storage);
  return storage.errorCount;
};

/**
 * Setzt Error-Counter zurück
 */
export const resetErrorCount = () => {
  const storage = getStorage();
  if (!storage.errorCount) return false;
  storage.errorCount = 0;
  saveStorage(storage);
  return true;
};

/**
 * Gibt aktuellen Error-Counter zurück
 * @returns {number} Error-Counter
 */
export const getErrorCount = () => {
  const storage = getStorage();
  return storage.errorCount || 0;
};
