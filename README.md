# 🎯 Appointment Monitor - Termin-Überwachungssystem

Vollautomatisches Node.js-System zur Überwachung von Webseiten auf neue verfügbare Termine mit Telegram-Benachrichtigungen.

**Perfect für:** KFZ-Zulassungsstellen, Behördentermine, Ticketing-Systeme, Restaurantreservierungen und alle zeitabhängigen Online-Services.

---

## 📋 Features

✅ **Automatische Webseiten-Überwachung** - Prüft regelmäßig die angegebene Seite  
✅ **Intelligente Terminerkennung** - Vergleicht mit vorherigen Ergebnissen  
✅ **Telegram-Benachrichtigungen** - Sofortige Push-Meldungen auf dem Smartphone  
✅ **Duplikat-Schutz** - Verhindert doppelte Meldungen  
✅ **Fehlerbehandlung & Retry** - Robuste Fehlerbehandlung mit automatischem Restart  
✅ **Headless Browser** - Spielzeuglos mit Playwright (Chromium)  
✅ **Konfigurierbar** - Anpassbare Prüfintervalle und Selektoren  
✅ **Logging** - Detailliertes Logging in Datei und Konsole  
✅ **Cross-Platform** - Läuft auf Windows, macOS, Linux  

---

## 🛠️ Technischer Stack

- **Node.js** 18+
- **Playwright** - Browser-Automatisierung
- **node-cron** - Zeitgesteuerte Jobs
- **dotenv** - Umgebungsvariablen-Management
- **Telegram Bot API** - Push-Benachrichtigungen

---

## 📦 Installation

### 1. Voraussetzungen

- Node.js 18+ ([Download](https://nodejs.org/))
- npm (wird mit Node.js mitgeliefert)
- Git (optional, für Klonen)

### 2. Projekt klonen/kopieren

```bash
git clone <repository-url> appointment-monitor
cd appointment-monitor
```

Oder manuell: Kopiere alle Dateien in einen Ordner.

### 3. Dependencies installieren

```bash
npm install
```

Dies installiert:
- `playwright` - Browser-Engine
- `node-cron` - Scheduling
- `dotenv` - Config-Management

### 4. Umgebungsvariablen konfigurieren

Kopiere `.env.example` zu `.env`:

```bash
cp .env.example .env
```

Bearbeite `.env` und setze deine Werte:

```env
TARGET_URL=https://termine.stadt-koeln.de/m/kfz-zulassung/extern/calendar/?uid=67523a04-37af-4131-9495-0a3566e0eb8b&wsid=f40e54e5-3570-4b4f-b999-23f3648c5d9c&lang=de
TELEGRAM_BOT_TOKEN=dein_token_hier
TELEGRAM_CHAT_ID=deine_chat_id_hier
CHECK_INTERVAL=*/10 * * * *
```

---

## 🤖 Telegram Bot Setup

### Schritt 1: Telegram Bot erstellen

1. Öffne Telegram und suche nach **@BotFather**
2. Sende `/start`
3. Sende `/newbot`
4. Wähle einen Namen für deinen Bot (z.B. "MeinTerminBot")
5. Wähle einen Username (muss mit `_bot` enden, z.B. "mein_termin_bot")
6. Du erhältst den **Bot Token** (z.B. `123456789:ABCdefGHIjklmnOPQRstuvWXYZ`)

**Speichere den Token!** → In `.env` als `TELEGRAM_BOT_TOKEN`

### Schritt 2: Chat ID ermitteln

**Methode 1: Mit deinem neuen Bot**

1. Öffne deinen Bot: `https://t.me/USERNAME_bot` (ersetze USERNAME)
2. Drücke "/start"
3. Öffne diese URL im Browser: `https://api.telegram.org/botTOKEN/getUpdates` (ersetze TOKEN)
4. Du siehst JSON. Suche nach `"chat":{"id":XXXXXXX}`
5. Die Zahl ist deine **Chat ID**

**Methode 2: Mit dem Bot**

```
1. Schreibe dem Bot eine beliebige Nachricht
2. Öffne im Browser: https://api.telegram.org/botTOKEN/getUpdates
3. Suche nach der neuesten Message und kopiere die Chat ID
```

**Speichere die Chat ID!** → In `.env` als `TELEGRAM_CHAT_ID`

### Schritt 3: Bot-Berechtigungen (optional)

Wenn du den Bot in einer Gruppe nutzen möchtest:

1. Erstelle eine Gruppe in Telegram
2. Füge deinen Bot der Gruppe hinzu
3. Gebe dem Bot Admin-Rechte (um Nachrichten zu senden)
4. Ermittle die Gruppen-Chat-ID ähnlich wie oben (hat ein `-` am Anfang)

---

## ⚙️ Konfiguration

### Umgebungsvariablen

| Variable | Beschreibung | Beispiel |
|----------|-------------|----------|
| `TARGET_URL` | Zu überwachende Webseite | `https://...` |
| `TELEGRAM_BOT_TOKEN` | Bot-Token von @BotFather | `123456789:ABC...` |
| `TELEGRAM_CHAT_ID` | Deine Telegram Chat ID | `987654321` |
| `CHECK_INTERVAL` | Cron-Ausdruck (siehe unten) | `*/10 * * * *` |
| `DEBUG` | Debug-Logging | `false` |
| `NODE_ENV` | Umgebung | `production` |

### CHECK_INTERVAL - Cron-Format

Format: `Minute Stunde Tag Monat Wochentag`

**Vorgegebene Beispiele:**

```
*/10 * * * *        → Alle 10 Minuten (EMPFOHLEN)
*/5 * * * *         → Alle 5 Minuten
0 * * * *          → Jede volle Stunde
0 */6 * * *        → Alle 6 Stunden
0 9 * * *          → Jeden Tag um 09:00 Uhr
0 */2 * * 1-5      → Alle 2 Stunden, Mo-Fr (Arbeitstage)
*/15 9-17 * * 1-5  → Alle 15 Min, 09:00-17:00, Mo-Fr
```

### Selektoren anpassen

Falls die Website nicht korrekt gescraped wird, passe die CSS-Selektoren in `src/checker.js` an:

```javascript
// In der extractAppointments() Funktion:
const dateSlots = document.querySelectorAll('[data-date-slot]'); // Ändere den Selector
```

Browser Developer Tools (F12) helfen beim Finden der richtigen Selektoren.

---

## 🚀 Verwendung

### Lokales Testen

```bash
npm start
```

Die Anwendung startet und:
1. Führt eine initiale Prüfung durch
2. Wartet bis zum nächsten geplanten Termin
3. Zeigt alle Aktivitäten im Log an

**Zum Beenden:** `Strg+C` drücken

### Debug-Modus

Aktiviere ausführliches Logging:

```bash
DEBUG=true npm start
```

---

## 🖥️ Dauerhafter Betrieb (Server)

### Auf Windows (mit NSSM)

1. **NSSM installieren** ([Download](https://nssm.cc/download))

2. Service registrieren:

```powershell
nssm install AppointmentMonitor "C:\Program Files\nodejs\node.exe" "C:\path\to\appointment-monitor\src\index.js"
nssm set AppointmentMonitor AppDirectory "C:\path\to\appointment-monitor"
nssm set AppointmentMonitor AppEnvironmentExtra "PATH=C:\Program Files\nodejs"
```

3. Service starten:

```powershell
nssm start AppointmentMonitor
```

4. Status prüfen:

```powershell
nssm status AppointmentMonitor
```

5. Service entfernen:

```powershell
nssm stop AppointmentMonitor
nssm remove AppointmentMonitor confirm
```

### Auf Linux/macOS (mit systemd/Supervisord)

#### Mit systemd (empfohlen):

Erstelle `/etc/systemd/system/appointment-monitor.service`:

```ini
[Unit]
Description=Appointment Monitor Service
After=network.target

[Service]
Type=simple
User=nobody
WorkingDirectory=/path/to/appointment-monitor
ExecStart=/usr/bin/node /path/to/appointment-monitor/src/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

Aktiviere und starte:

```bash
sudo systemctl daemon-reload
sudo systemctl enable appointment-monitor
sudo systemctl start appointment-monitor
sudo systemctl status appointment-monitor
```

Logs anschauen:

```bash
sudo journalctl -u appointment-monitor -f
```

#### Mit Supervisord:

Erstelle `/etc/supervisor/conf.d/appointment-monitor.conf`:

```ini
[program:appointment-monitor]
command=/usr/bin/node /path/to/appointment-monitor/src/index.js
directory=/path/to/appointment-monitor
autostart=true
autorestart=true
stderr_logfile=/var/log/appointment-monitor.err.log
stdout_logfile=/var/log/appointment-monitor.out.log
environment=NODE_ENV=production
```

Starten:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start appointment-monitor
```

### Auf Docker (bonus)

Erstelle `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

CMD ["node", "src/index.js"]
```

Baue und starte:

```bash
docker build -t appointment-monitor .
docker run --env-file .env appointment-monitor
```

---

## 📝 Logs

### Log-Dateien

Logs werden gespeichert in: `./logs/app.log`

Struktur:
```
[2024-01-15T10:30:45.123Z] [INFO] Starte Termin-Prüfung
[2024-01-15T10:30:47.456Z] [INFO] Termine extrahiert | {"count": 5}
[2024-01-15T10:30:48.789Z] [WARN] Keine Änderungen erkannt
```

### Live-Logs im Terminal

```bash
# Nur die letzten 20 Zeilen
tail -20 logs/app.log

# Live-Stream
tail -f logs/app.log

# Mit Filtering
grep "ERROR" logs/app.log
```

---

## 🐛 Troubleshooting

### Problem: "Umgebungsvariablen fehlen"

**Lösung:**
- Stelle sicher, dass `.env` im Projektroot existiert
- Überprüfe die erforderlichen Variablen: `TARGET_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- Speichere die Datei und starte neu

### Problem: "Termine werden nicht erkannt"

**Lösung:**
- Aktiviere Debug-Modus: `DEBUG=true npm start`
- Überprüfe die Browser-Selektoren in `src/checker.js`
- Öffne die Webseite manuell und überprüfe mit DevTools (F12)
- Passe die CSS-Selektoren an die Website an

### Problem: "Telegram-Benachrichtigungen funktionieren nicht"

**Lösung:**
- Überprüfe `TELEGRAM_BOT_TOKEN` und `TELEGRAM_CHAT_ID` in `.env`
- Teste die Verbindung: Öffne im Browser: `https://api.telegram.org/botTOKEN/getMe`
- Stelle sicher, dass der Bot dir eine Nachricht senden darf
- Überprüfe Firewall/Proxy-Einstellungen

### Problem: "Browser startet nicht"

**Lösung:**
```bash
# Neu installieren
npm install --force

# Playwright Chromium neu herunterladen
npx playwright install
```

### Problem: "Service wird nicht gestartet"

**Lösung:**
- Überprüfe `.env` Datei ist vorhanden und richtig konfiguriert
- Stelle sicher, alle Pfade absolut sind (keine relativen Pfade)
- Schau in den Service-Logs nach Fehlern

---

## 📊 Dateistruktur

```
appointment-monitor/
├── src/
│   ├── index.js              # Haupteinstiegspunkt
│   ├── checker.js            # Playwright-Logik
│   ├── notifier.js           # Telegram-Integration
│   ├── storage.js            # JSON-Speicherung
│   └── logger.js             # Logging-Utility
├── logs/
│   └── app.log              # Anwendungs-Logs
├── storage.json             # Gespeicherte Termine
├── package.json             # Dependencies
├── .env                     # Umgebungsvariablen (NICHT committen!)
├── .env.example             # Template für .env
├── .gitignore              # Git-Ignore Regeln
└── README.md               # Diese Datei
```

---

## 🔐 Sicherheit

⚠️ **Wichtig:**
- `.env` Datei NIEMALS in Git committen (ist in `.gitignore`)
- Bot-Tokens sind geheim - teile sie nicht
- Speichere `.env` sicher lokal
- Verwende einen dedizierten Bot pro Anwendung

---

## 🚨 Fehlerbehandlung

Das System hat eingebaute Fehlerbehandlung:

- **Timeout-Schutz:** Browser-Operationen haben Timeouts
- **Retry-Mechanismus:** Fehler werden gezählt und bei 3 Fehlern wird eine Warnung gesendet
- **Graceful Shutdown:** Sauberes Beenden bei Fehlern
- **Error Recovery:** System läuft weiter, auch wenn einzelne Checks fehlschlagen

---

## 📈 Performance

Die Anwendung ist leichtgewichtig:

- **RAM:** ~80-120 MB
- **CPU:** Minimal (nur bei Checks aktiv)
- **Netzwerk:** ~500KB pro Prüfung
- **Plattenplatz:** ~200 MB (mit Playwright)

**Empfohlener Check-Intervall:** Alle 5-10 Minuten

---

## 🎯 Anwendungsbeispiele

### Köln KFZ-Zulassung (voreingestellt)
```env
TARGET_URL=https://termine.stadt-koeln.de/m/kfz-zulassung/...
CHECK_INTERVAL=*/10 * * * *
```

### Restaurant-Reservierung
```env
TARGET_URL=https://restaurant.com/reservation/
CHECK_INTERVAL=0 * * * *  (Stündlich)
```

### Ticketing-System
```env
TARGET_URL=https://ticketing.com/concert/123
CHECK_INTERVAL=*/5 * * * *  (Alle 5 Minuten)
```

---

## 📚 Weitere Ressourcen

- [Playwright Dokumentation](https://playwright.dev)
- [node-cron Dokumentation](https://github.com/node-cron/node-cron)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Cron-Ausdrücke Generator](https://crontab.guru)

---

## 📄 Lizenz

MIT License - Frei verwendbar

---

## 🤝 Unterstützung

Bei Fragen oder Problemen:

1. Überprüfe den Abschnitt "Troubleshooting"
2. Schau in die Logs: `tail -f logs/app.log`
3. Aktiviere Debug-Modus für detaillierte Ausgabe
4. Überprüfe die Konfiguration in `.env`

---

**Viel Erfolg! 🎉**
