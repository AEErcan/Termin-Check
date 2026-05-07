// checker.js - Playwright-Logik für Webseiten-Überwachung
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCREENSHOTS_DIR = join(__dirname, '..', 'screenshots');

const isDebug = () => process.env.DEBUG === 'true';

/**
 * Speichert einen Screenshot mit Zeitstempel
 * @param {Page} page
 * @param {string} label - z.B. "01-start", "fehler-kein-button"
 */
const screenshot = async (page, label) => {
  if (!isDebug()) return;
  try {
    if (!existsSync(SCREENSHOTS_DIR)) {
      mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(SCREENSHOTS_DIR, `${ts}_${label}.png`);
    await page.screenshot({ path: file, fullPage: true });
    logger.debug(`Screenshot gespeichert: ${file}`);
  } catch (e) {
    logger.debug('Screenshot fehlgeschlagen', { error: e.message });
  }
};

let browserInstance = null;

const getBrowser = async () => {
  if (!browserInstance) {
    try {
      browserInstance = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled'],
      });
      logger.info('Browser gestartet');
    } catch (error) {
      logger.error('Fehler beim Starten des Browsers', { error: error.message });
      throw error;
    }
  }
  return browserInstance;
};

export const closeBrowser = async () => {
  if (browserInstance) {
    try {
      await browserInstance.close();
      browserInstance = null;
      logger.info('Browser geschlossen');
    } catch (error) {
      logger.error('Fehler beim Schließen des Browsers', { error: error.message });
    }
  }
};

const waitForPageLoad = async (page, timeout = 30000) => {
  try {
    await page.waitForLoadState('networkidle', { timeout }).catch(() => {
      logger.debug('Network nicht idle innerhalb des Timeouts');
    });
    logger.debug('Seite vollständig geladen');
  } catch (error) {
    logger.warn('Fehler beim Warten auf Seitenladung', { error: error.message });
  }
};

/**
 * Navigiert durch die Terminbuchungs-Seite und extrahiert verfügbare Termine
 * @param {Page} page - Playwright Page-Objekt
 * @returns {array} Array von Terminen { date, time, location, description }
 */
const extractAppointments = async (page) => {
  try {
    // Schritt 1: Button "Neuen Termin buchen" klicken
    logger.debug('Suche nach "Neuen Termin buchen"');

    const bookBtn = page.locator('button, a').filter({ hasText: /neuen termin buchen/i }).first();
    if (!(await bookBtn.isVisible({ timeout: 8000 }).catch(() => false))) {
      await screenshot(page, 'fehler-kein-buchen-button');
      logger.error('"Neuen Termin buchen" nicht gefunden');
      return [];
    }

    await bookBtn.click();
    logger.debug('"Neuen Termin buchen" geklickt');

    await page
      .waitForSelector('text=Allgemeine Zulassungsangelegenheiten', { timeout: 15000 })
      .catch(() => logger.debug('Warte-Timeout nach Button-Klick'));
    await page.waitForTimeout(1500);

    // Schritt 2: Tab "Allgemeine Zulassungsangelegenheiten" klicken
    const tab = page
      .locator('button, a, [role="tab"]')
      .filter({ hasText: /allgemeine zulassungsangelegenheiten/i })
      .first();

    if (await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(1500);
    } else {
      logger.debug('Tab nicht gefunden – Inhalt möglicherweise bereits sichtbar');
    }

    // Schritt 3: Dropdown für "Anmeldung eines Gebrauchtfahrzeuges" auf 1 setzen
    const serviceContainer = page
      .locator('li, tr, div, label')
      .filter({ hasText: /anmeldung eines gebrauchtfahrzeuges/i })
      .first();

    if (!(await serviceContainer.isVisible({ timeout: 5000 }).catch(() => false))) {
      await screenshot(page, 'fehler-kein-service-container');
      logger.error('Service-Option "Anmeldung eines Gebrauchtfahrzeuges" nicht gefunden');
      return [];
    }

    const dropdown = serviceContainer.locator('select').first();
    const numberInput = serviceContainer.locator('input[type="number"]').first();

    if (await dropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dropdown.selectOption('1');
    } else if (await numberInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await numberInput.fill('1');
    } else {
      const firstSelect = page.locator('select').first();
      if (await firstSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstSelect.selectOption('1');
      }
    }

    await page.waitForTimeout(1000);

    // Schritt 4: "Weiter"-Button klicken
    const weiterBtn = page
      .locator('button, input[type="submit"], a')
      .filter({ hasText: /^weiter$/i })
      .first();

    if (await weiterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await weiterBtn.click();
    } else {
      const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();
      } else {
        await screenshot(page, 'fehler-kein-weiter-button');
        logger.error('"Weiter"-Button nicht gefunden');
        return [];
      }
    }

    await page.waitForTimeout(4000);

    // Schritt 5: Verfügbare Termine aus dem Kalender extrahieren
    logger.debug('Extrahiere Termine aus dem Kalender');

    const appointments = await page.evaluate(() => {
      const slots = [];
      const seen = new Set();

      const addSlot = (date, time, source) => {
        if (!date) return;
        const key = `${date}|${time}`;
        if (seen.has(key)) return;
        seen.add(key);
        slots.push({
          date,
          time: time || '',
          location: 'Köln KFZ-Zulassung',
          description: 'Anmeldung Gebrauchtfahrzeug (Umschreibung)',
          source,
        });
      };

      // Versuch 1: Elemente mit data-date Attribut
      document.querySelectorAll('[data-date]').forEach((el) => {
        const isDisabled =
          el.disabled ||
          el.classList.contains('disabled') ||
          el.classList.contains('unavailable') ||
          el.getAttribute('aria-disabled') === 'true';
        if (!isDisabled) {
          addSlot(el.getAttribute('data-date'), el.getAttribute('data-time') || '', 'data-date');
        }
      });

      // Versuch 2: Kalender-Zellen mit DD.MM.YYYY Text
      if (slots.length === 0) {
        const datePattern = /(\d{2}\.\d{2}\.\d{4})/;
        const timePattern = /(\d{2}:\d{2})/;

        document.querySelectorAll('td, .calendar-day, .day, [role="gridcell"]').forEach((el) => {
          const isDisabled =
            el.classList.contains('disabled') ||
            el.classList.contains('unavailable') ||
            el.classList.contains('empty') ||
            el.getAttribute('aria-disabled') === 'true';
          if (isDisabled) return;

          const text = el.textContent.trim();
          const dateMatch = text.match(datePattern);
          const timeMatch = text.match(timePattern);
          if (dateMatch) {
            addSlot(dateMatch[1], timeMatch ? timeMatch[1] : '', 'calendar-cell');
          }
        });
      }

      // Versuch 3: Klickbare Buttons mit Datumsinformation
      if (slots.length === 0) {
        const datePattern = /(\d{2}\.\d{2}\.\d{4})/;
        const timePattern = /(\d{2}:\d{2})/;

        document.querySelectorAll('button:not([disabled]), a[href]').forEach((el) => {
          if (el.classList.contains('disabled')) return;
          const text = el.textContent.trim();
          const dateMatch = text.match(datePattern);
          const timeMatch = text.match(timePattern);
          if (dateMatch) {
            addSlot(dateMatch[1], timeMatch ? timeMatch[1] : '', 'button');
          }
        });
      }

      return slots;
    });

    logger.info('Termine extrahiert', { count: appointments.length });

    return appointments;
  } catch (error) {
    await screenshot(page, 'fehler-exception').catch(() => {});
    logger.error('Fehler beim Extrahieren der Termine', { error: error.message });
    return [];
  }
};

/**
 * Filtert Termine: nur solche die maximal 7 Tage in der Zukunft liegen
 * @param {array} appointments
 * @returns {array}
 */
export const filterUpcomingAppointments = (appointments) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + 7);

  return appointments.filter((apt) => {
    // Format: DD.MM.YYYY
    const parts = apt.date.split('.');
    if (parts.length !== 3) return false;
    const date = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    return date >= today && date <= cutoff;
  });
};

/**
 * Hauptfunktion - Prüft die Webseite auf neue Termine
 * @param {string} url - URL der zu prüfenden Webseite
 * @returns {object} { success: boolean, appointments: array, error?: string }
 */
export const checkForAppointments = async (url) => {
  let page = null;
  let context = null;

  try {
    if (!url) {
      throw new Error('Keine URL angegeben');
    }

    logger.info('Starte Termin-Prüfung', { url, debug: isDebug() });

    const browser = await getBrowser();

    context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    page = await context.newPage();

    logger.debug('Navigiere zur Seite');
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await waitForPageLoad(page, 25000);
    await page.waitForTimeout(3000);

    const appointments = await extractAppointments(page);

    logger.info('Termin-Prüfung erfolgreich', { foundAppointments: appointments.length });

    return {
      success: true,
      appointments,
    };
  } catch (error) {
    if (page) {
      await screenshot(page, 'fehler-main').catch(() => {});
    }
    logger.error('Fehler bei Termin-Prüfung', { error: error.message, url });

    return {
      success: false,
      appointments: [],
      error: error.message,
    };
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (e) {
        logger.debug('Fehler beim Schließen der Page', { error: e.message });
      }
    }

    if (context) {
      try {
        await context.close();
      } catch (e) {
        logger.debug('Fehler beim Schließen des Context', { error: e.message });
      }
    }
  }
};

export const cleanup = async () => {
  await closeBrowser();
};
