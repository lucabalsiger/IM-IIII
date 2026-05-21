# Baby Sleep Assistant

## Kurzbeschreibung des Projekts

* **Modul:** Interaktive Medien 4 an der Fachhochschule Graubünden (FS26)
* **Themenfeld:** IoT-Applikation zum Thema Eltern mit kleinen Kindern
* **Name des Projekts:** Baby Sleep Assistant
* **Team Physical Computing:** *[Namen eintragen]*
* **Team WebApp:** Luca Balsiger

**Welches Problem wird gelöst?**
Eltern mit kleinen Kindern wissen oft nicht, ob die Schlafumgebung ihres Kindes optimal ist. Zu warme, zu laute oder zu feuchte Räume beeinflussen die Schlafqualität erheblich — ohne dass Eltern es merken.

**Sinn und Zweck des Systems:**
Baby Sleep Assistant überwacht automatisch Temperatur, Luftfeuchtigkeit und Geräuschpegel im Kinderzimmer sowie die Schlafqualität des Kindes via Bewegungssensor. Die Daten werden live auf einer Webapp visualisiert und regelbasiert ausgewertet, sodass Eltern konkrete Handlungsempfehlungen erhalten.

---

### UX & Konzeption

* **Figma:** [Link zum Figma](https://www.figma.com/design/K9hdwVbvVTHuySxNX6CKSt/IM-4-%E2%80%93-App-Konzeption-Vorlage?node-id=40000119-196&t=oJSTsCzgdP61sonk-1)
* **User Flow + Screen Flow** *(Screenshot aus Figma einfügen)*

**Umgesetzte Features:**
- Live-Dashboard mit Temperatur, Luftfeuchtigkeit und Geräuschpegel
- Schlafanalyse mit farbiger Timeline (Calm / Restless / Awake)
- KI-gestützte Insights mit Sleep Score (0–100)
- Login / Registrierung / Passwort-zurücksetzen per E-Mail
- Automatische Datenerfassung über zwei ESP32-C6 Sensoren

**Nicht umgesetzte Features:**
- Push-Notifications bei kritischen Werten (z.B. zu laut, zu warm)
- Historische Trendansicht über mehrere Nächte
- Mehrere Kinder / Profile pro Account

---

### Setup

* **WebApp:** [im4.lucabalsiger.ch/dashboard.html](https://im4.lucabalsiger.ch/dashboard.html)
* **Video-Dokumentation:** [Link zum Video auf Youtube](http://link.zum.video)

#### Installationsanleitung WebApp

**1. Infrastruktur**
- Webserver mit PHP 8.x und MySQL (z.B. Infomaniak Shared Hosting)
- FTP-Zugang zum Server
- GitHub Account für automatisches Deployment

**2. Repository klonen**
```bash
git clone https://github.com/lucabalsiger/IM-IIII.git
```

**3. Datenbank einrichten**
In phpMyAdmin eine neue Datenbank erstellen und folgende Tabellen anlegen:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE environment_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  temperature DECIMAL(5,2) DEFAULT 0,
  humidity DECIMAL(5,2) DEFAULT 0,
  sound_level INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sleep_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  quality ENUM('calm','restless','awake') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**4. DB-Credentials eintragen**
Datei `system/config.php` auf dem Server erstellen (wird nie ins Git committed):

```php
<?php
$host = 'dein-db-host';
$db   = 'dein-db-name';
$user = 'dein-db-user';
$pass = 'dein-db-passwort';

$dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";
$pdo = new PDO($dsn, $user, $pass);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
```

**5. Resend API Key eintragen**
Für den E-Mail-Versand (Passwort zurücksetzen) wird [Resend](https://resend.com) verwendet. API-Key in `system/config.php` ergänzen:

```php
$resend_api_key = 'dein-resend-api-key';
```

**6. Automatisches Deployment (optional)**
GitHub Actions deployt bei jedem Push auf `main` automatisch per FTP. Dazu drei Secrets im GitHub Repository hinterlegen:
- `FTP_HOST` — FTP-Server-Adresse
- `FTP_USER` — FTP-Benutzername
- `FTP_PASS` — FTP-Passwort

---

#### Bauanleitung Physical Computing

**Benötigte Komponenten (pro Sensor-Board):**
| Komponente | Zweck |
|---|---|
| ESP32-C6 DevKit | Mikrocontroller mit WLAN |
| DHT11 | Temperatur & Luftfeuchtigkeit |
| KY-038 (Schallsensor) | Geräuschpegel |
| MPU6050 | Bewegungserkennung (Schlafqualität) |

**Verkabelung Sensor-Board (Kombi-Sketch):**
| Sensor | Pin am ESP32-C6 |
|---|---|
| DHT11 Data | GPIO 4 |
| KY-038 Analog | GPIO 34 |
| MPU6050 SDA | GPIO 21 |
| MPU6050 SCL | GPIO 22 |
| VCC (alle) | 3.3V |
| GND (alle) | GND |

**Software installieren:**
1. [Arduino IDE](https://www.arduino.cc/en/software) installieren
2. ESP32-Board-Package hinzufügen: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. Board: **ESP32C6 Dev Module**
4. Libraries installieren (Manage Libraries):
   - `DHT sensor library` by Adafruit
   - `Adafruit MPU6050` by Adafruit
   - `Adafruit Unified Sensor` by Adafruit

**Sketch flashen:**
1. `arduino/sensor_komplett/sensor_komplett.ino` öffnen
2. WLAN-Daten eintragen:
```cpp
const char* WIFI_SSID = "euer-wlan";
const char* WIFI_PASS = "euer-passwort";
```
3. BOOT-Taste halten → Upload → bei "Connecting..." loslassen

---

## Technische Details

### Projektstruktur

```
IM-IIII/
├── api/
│   ├── login.php          # POST: Benutzer einloggen
│   ├── register.php       # POST: Benutzer registrieren
│   ├── logout.php         # Session beenden, Redirect
│   ├── me.php             # GET: Session-Check
│   ├── sensor.php         # POST: Sensordaten empfangen / GET: Daten abrufen
│   ├── sensor_write.php   # POST: Alternativer Endpunkt für externe Teams
│   ├── forgot-password.php # POST: Reset-Link per E-Mail senden
│   └── reset-password.php  # POST: Neues Passwort setzen
├── js/
│   ├── login.js           # Login-Formular Logik
│   ├── register.js        # Registrierungs-Formular Logik
│   ├── dashboard.js       # Live-Charts und Sensor-Polling
│   ├── sleep.js           # Schlafanalyse und Timeline
│   ├── insights.js        # Regelbasierte Auswertung und Score
│   ├── forgot-password.js
│   └── reset-password.js
├── system/
│   └── config.php         # DB-Credentials (gitignored)
├── arduino/
│   ├── sensor_komplett/   # Kombi-Sketch: DHT11 + KY-038 + MPU6050
│   ├── sensor1_umgebung/  # Nur Temperatur & Luftfeuchtigkeit
│   └── sensor2_schlaf/    # Nur Schlafqualität via Bewegung
├── dashboard.html
├── sleep.html
├── insights.html
├── login.html
├── register.html
├── forgot-password.html
└── reset-password.html
```

### Datenschnittstelle (WebApp ↔ Physical Computing)

Der ESP32 sendet alle 5 Minuten HTTP POST-Requests an die API:

```
POST https://im4.lucabalsiger.ch/api/sensor.php
Content-Type: application/x-www-form-urlencoded

# Umgebungsdaten:
type=environment&user_id=11&temperature=22.5&humidity=55&sound_level=12

# Schlafdaten:
type=sleep&user_id=11&quality=calm
```

Response: `{ "success": true }`

### ERM (Entity Relationship Model)

```
users (id, email, password, created_at)
    |
    ├── environment_data (id, user_id, temperature, humidity, sound_level, created_at)
    └── sleep_data (id, user_id, quality, created_at)

password_resets (id, email, token, expires_at, created_at)
```

### Authentifizierung

Login setzt eine PHP-Session (`$_SESSION['user_id']`). Alle geschützten Seiten rufen beim Laden `api/me.php` auf — liefert diese kein `success: true`, wird auf `login.html` weitergeleitet. Sensor-Endpunkte (POST) benötigen keine Session, da die `user_id` direkt im Request mitgeschickt wird.

---

## Known Bugs

- WLAN-Verbindung auf ESP32-C6 schlägt fehl, wenn das Netz MAC-Filtering oder ein Captive Portal verwendet
- Sleep-Timeline zeigt nur Daten der aktuellen Nacht (kein historischer Rückblick)
- Sound-Level-Werte des KY-038 sind nicht kalibriert (relative Skala 0–100, keine echten dB)
- Bei sehr vielen Datenpunkten kann das Dashboard-Chart unübersichtlich werden

---

## Umsetzungsprozess

**Reflexion / Lernfortschritt:**
Das Projekt hat gezeigt, wie komplex die Verbindung von Hardware und Webapplikation in der Praxis ist. Besonders die Fehlersuche bei WiFi-Verbindungsproblemen (ESP32-C6 und ältere Router) sowie die JSON-Korruption durch PHP-Output-Buffering waren lehrreich. Der Einsatz von GitHub Actions für automatisches Deployment hat die Entwicklung erheblich beschleunigt.

**Herausforderungen & Lösungen:**
- *PHP mail() auf Infomaniak deaktiviert* → Lösung: Resend REST API via curl
- *JSON-Antworten korrupt durch PHP-Output* → Lösung: `ob_start()` / `ob_clean()` Pattern in allen API-Files
- *ESP32-C6 verbindet sich nicht mit WLAN* → Lösung: `WiFi.mode(WIFI_STA)` + `WiFi.disconnect(true)` vor `WiFi.begin()`
- *API-Key versehentlich ins Git committed* → Lösung: Key widerrufen, neuen Key in gitignorierter `system/config.php` ablegen

**KI-Einsatz:**
Claude (Anthropic) wurde während der gesamten Entwicklung als Coding-Assistent eingesetzt — für die Generierung von PHP-API-Dateien, JavaScript-Logik, Arduino-Sketches, SQL-Abfragen und Debugging. Der Code wurde stets überprüft und angepasst. KI hat die Entwicklungsgeschwindigkeit massgeblich erhöht, ersetzt aber nicht das Verständnis der zugrundeliegenden Konzepte.
