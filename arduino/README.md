# Sensor-Code für ESP32-C6
> Dieser Code läuft auf dem ESP32-C6 und erfasst alle 30 Sekunden 
> Temperatur, Luftfeuchtigkeit, Geräuschpegel und Bewegung im Kinderzimmer. 
> Die Daten werden automatisch ans Backend gesendet.
> Für die vollständige Projektdokumentation → siehe Haupt-README.

## Kombi-Sketch — Temperatur, Luftfeuchtigkeit, Bewegung & Geräusch
**Ordner:** `sensor_komplett/`

## Voraussetzungen
1. [Arduino IDE](https://www.arduino.cc/en/software) installieren
2. ESP32-Board-Package hinzufügen: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. Board: **ESP32C6 Dev Module**

### Hardware
- ESP32-C6
- DHT11 → GPIO 3
- SR602 PIR → GPIO 7
- INMP441 → GPIO 8 (SCK) / GPIO 13 (SD) / GPIO 23 (WS)

### Libraries installieren (Arduino IDE → Library Manager)
- `DHT sensor library` von Adafruit
- `Adafruit Unified Sensor` von Adafruit

### Konfiguration
In `sensor_komplett.ino` anpassen:
```cpp
const char* WIFI_SSID = "WLAN-NAME";
const char* WIFI_PASS = "WLAN-PASSWORT";
```
### Sketch flashen
1. `sensor_komplett.ino` in Arduino IDE öffnen
2. ESP32-C6 per USB verbinden
3. BOOT-Taste halten → Upload → bei "Connecting..." loslassen
4. Seriellen Monitor öffnen (115200 Baud) → Verbindung und Messwerte prüfen

### Schlafqualität-Logik
Der SR602 PIR misst Bewegung über 10 Messungen in 2 Sekunden:
```cpp
if (motionCount > 5) return "awake";    // mehr als 5 von 10 → wach
if (motionCount > 2) return "restless"; // 3–5 von 10 → unruhig
return "calm";                          // 0–2 von 10 → ruhig
```

---

## API-Endpoint
```
POST https://im4.lucabalsiger.ch/api/sensor.php
user_id = 11
```
**Sendet zwei Requests alle 30 Sekunden:**
- `type=environment` → Temperatur, Luftfeuchtigkeit, Schallpegel
- `type=sleep` → Schlafqualität (calm / restless / awake)
