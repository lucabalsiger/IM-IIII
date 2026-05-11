# Sensor-Code für ESP32-C6

## Sensor 1 — Temperatur & Luftfeuchtigkeit
**Ordner:** `sensor1_umgebung/`

### Hardware
- ESP32-C6
- DHT22 → GPIO 4

### Libraries installieren (Arduino IDE → Library Manager)
- `DHT sensor library` von Adafruit
- `Adafruit Unified Sensor` von Adafruit

### Konfiguration
In `sensor1_umgebung.ino` anpassen:
```cpp
const char* WIFI_SSID = "WLAN-NAME";
const char* WIFI_PASS = "WLAN-PASSWORT";
```

---

## Sensor 2 — Licht & Schlafqualität
**Ordner:** `sensor2_schlaf/`

### Hardware
- ESP32-C6
- LDR (Fotowiderstand) → GPIO 34 (analog)
- MPU6050 (Beschleunigungssensor) → I2C (SDA = GPIO 21, SCL = GPIO 22)

### Libraries installieren (Arduino IDE → Library Manager)
- `Adafruit MPU6050` von Adafruit
- `Adafruit Unified Sensor` von Adafruit

### Konfiguration
In `sensor2_schlaf.ino` anpassen:
```cpp
const char* WIFI_SSID = "WLAN-NAME";
const char* WIFI_PASS = "WLAN-PASSWORT";
```

### Schlafqualität-Logik
Der MPU6050 misst Bewegung. Die Schwellenwerte können angepasst werden:
```cpp
const float THRESHOLD_AWAKE    = 1.5;  // m/s² → wach
const float THRESHOLD_RESTLESS = 0.4;  // m/s² → unruhig
```

---

## API-Endpoint
```
POST https://im4.lucabalsiger.ch/api/sensor.php
user_id = 11
```
