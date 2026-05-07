// notifier.js - Verwaltet Telegram-Benachrichtigungen
import { logger } from './logger.js';
import { recordNotification, hasBeenNotified } from './storage.js';

/**
 * Sendet eine Benachrichtigung über Telegram Bot API
 * @param {string} message - Nachricht zum Senden
 * @returns {boolean} True wenn erfolgreich
 */
export const sendTelegramNotification = async (message) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    logger.error('Telegram-Credentials nicht konfiguriert', {
      hasBotToken: !!botToken,
      hasChatId: !!chatId,
    });
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Telegram API Fehler', { status: response.status, error });
      return false;
    }

    const result = await response.json();
    logger.info('Telegram-Nachricht gesendet', { messageId: result.result?.message_id });
    return true;
  } catch (error) {
    logger.error('Fehler beim Senden der Telegram-Nachricht', { error: error.message });
    return false;
  }
};

/**
 * Formatiert eine Benachrichtigung für neue Termine
 * @param {array} appointments - Array von Terminen
 * @returns {string} Formatierte Nachricht
 */
export const formatAppointmentNotification = (appointments) => {
  if (!appointments || appointments.length === 0) {
    return 'Keine Termine verfügbar.';
  }

  let message = '🎉 <b>Neue Termine verfügbar!</b>\n\n';

  appointments.forEach((apt, index) => {
    message += `<b>Termin ${index + 1}:</b>\n`;
    message += `📅 <b>Datum:</b> ${apt.date || 'Nicht verfügbar'}\n`;

    if (apt.time) {
      message += `⏰ <b>Uhrzeit:</b> ${apt.time}\n`;
    }

    if (apt.location) {
      message += `📍 <b>Ort:</b> ${apt.location}\n`;
    }

    if (apt.description) {
      message += `📝 ${apt.description}\n`;
    }

    if (index < appointments.length - 1) {
      message += '\n' + '─'.repeat(40) + '\n\n';
    }
  });

  message += '\n🔗 <b>Link:</b> ';
  message += `<a href="${process.env.TARGET_URL}">Zur Webseite</a>`;

  return message;
};

/**
 * Sendet Benachrichtigungen für neue Termine (mit Duplikat-Schutz)
 * @param {array} newAppointments - Array von neuen Terminen
 * @returns {boolean} True wenn mindestens eine Nachricht gesendet wurde
 */
export const notifyNewAppointments = async (newAppointments) => {
  if (!newAppointments || newAppointments.length === 0) {
    logger.debug('Keine neuen Termine zum Benachrichtigen');
    return false;
  }

  // Filtere bereits benachrichtigte Termine
  const appointmentsToNotify = newAppointments.filter((apt) => {
    const key = `${apt.date}|${apt.time}`;
    if (hasBeenNotified(key)) {
      logger.debug('Termin bereits benachrichtigt', { key });
      return false;
    }
    return true;
  });

  if (appointmentsToNotify.length === 0) {
    logger.info('Alle neuen Termine wurden bereits benachrichtigt');
    return false;
  }

  const message = formatAppointmentNotification(appointmentsToNotify);

  try {
    const success = await sendTelegramNotification(message);

    if (success) {
      // Markiere alle benachrichtigten Termine
      appointmentsToNotify.forEach((apt) => {
        const key = `${apt.date}|${apt.time}`;
        recordNotification(key);
      });
      logger.info('Benachrichtigungen versendet', {
        count: appointmentsToNotify.length,
      });
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Fehler beim Benachrichtigen', { error: error.message });
    return false;
  }
};

/**
 * Sendet eine Status-Nachricht an Telegram
 * @param {string} status - Status-Text
 * @param {boolean} isError - Ist es eine Error-Nachricht
 */
export const sendStatusNotification = async (status, isError = false) => {
  const emoji = isError ? '❌' : '✅';
  const message = `${emoji} <b>${status}</b>\n\nZeit: ${new Date().toLocaleString(
    'de-DE'
  )}`;

  try {
    await sendTelegramNotification(message);
  } catch (error) {
    logger.error('Fehler beim Senden der Status-Nachricht', { error: error.message });
  }
};
