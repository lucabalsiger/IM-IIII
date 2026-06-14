// Sensor Komplett — Temperatur, Luftfeuchtigkeit, Bewegung und Geräusche
// Hardware: ESP32-C6 + DHT11 (GPIO 3) + SR602 PIR (GPIO 7) + INMP441 (GPIO 8/13/23)
// Libraries (Arduino IDE → Manage Libraries):
//   - "DHT sensor library" von Adafruit
//   - "Adafruit Unified Sensor" von Adafruit

#include <WiFi.h>          // WLAN-Funktionalität des ESP32
#include <HTTPClient.h>    // HTTP-Kommunikation (Daten an Server senden)
#include <DHT.h>           // Bibliothek für DHT11 Temperatur- und Feuchtigkeitssensor
#include <driver/i2s.h>    // I2S-Schnittstelle für digitales Mikrofon (INMP441)
#include <math.h>          // Mathematische Funktionen (sqrt, log10)

// ==================== Konfiguration ====================

// WLAN-Zugangsdaten (für Verbindung zum Netzwerk)
const char* WIFI_SSID = "euer-wlan";
const char* WIFI_PASS = "euer_passwort";

// API-Endpunkt des Servers zur Datenübertragung (HTTP POST)
const char* API_URL   = "https://im4.lucabalsiger.ch/api/sensor.php";

// Benutzer-ID zur Zuordnung der Messdaten auf dem Server
const int USER_ID   = 11;

// GPIO-Pins der angeschlossenen Sensoren (ESP32 Pinbelegung beachten!)
const int DHT_PIN   = 3;   // Temperatur- und Feuchtigkeitssensor DHT11
const int PIR_PIN   = 7;   // Bewegungsmelder (PIR-Sensor)

// Messintervall in Sekunden (Zeit zwischen zwei Datenübertragungen)
const int INTERVAL  = 30;

// ==================== I2S Mikrofon (INMP441) ====================

// I2S Pin-Konfiguration für digitales Mikrofon
#define I2S_WS   23   // Word Select – sagt dem Mikrofon wann es senden soll
#define I2S_SD   13   // Serial Data – hier kommen die Audiodaten rein
#define I2S_SCK  8    // Clock – gibt den Takt vor
#define I2S_PORT I2S_NUM_0

// ================================================================

// Initialisierung des DHT11 Sensors
DHT dht(DHT_PIN, DHT11);

// Puffer für Audiosamples vom Mikrofon
#define BUFFER_SIZE 512
int32_t samples[BUFFER_SIZE];

// Variablen zur Berechnung und Glättung des Schallpegels
float smoothedSPL = 0;          // geglätteter Schalldruckpegel (Stabilisierung der Werte)
const float filterFactor = 0.5; // Glättungsfaktor (0 = stark geglättet, 1 = keine Glättung)
const float DB_OFFSET = 110.0;  // Korrekturwert für relative dB-Darstellung (nicht kalibriert)

// ================================================================
// Initialisierung der I2S-Schnittstelle für das Mikrofon
// ================================================================
void setupI2S() {

  // Konfiguration der I2S-Audioaufnahme
  i2s_config_t config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX), // ESP32 als Master im Empfangsmodus
    .sample_rate = 16000,                 // Abtastrate: 16 kHz
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT, // 32-bit Datenformat (Standard für INMP441)
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,   // Nur linker Audiokanal wird genutzt
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 1024,
    .use_apll = false
  };

  // Zuordnung der ESP32 Pins zum I2S Mikrofon
  i2s_pin_config_t pins = {
    .mck_io_num = I2S_PIN_NO_CHANGE,
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = I2S_SD
  };

  // I2S-Treiber installieren
  i2s_driver_install(I2S_PORT, &config, 0, NULL);

  // Pin-Konfiguration anwenden
  i2s_set_pin(I2S_PORT, &pins);

  // DMA-Puffer zurücksetzen (verhindert alte Daten im Speicher)
  i2s_zero_dma_buffer(I2S_PORT);
}

// ================================================================
// Ermittlung des Schallpegels (dB) aus Mikrofondaten
// ================================================================
float readSoundLevel() {

  size_t bytesRead = 0;

  // Rohdaten vom I2S Mikrofon einlesen
  esp_err_t result =
      i2s_read(I2S_PORT,
               &samples,
               sizeof(samples),
               &bytesRead,
               portMAX_DELAY);

  // Nur weiterverarbeiten, wenn Daten erfolgreich gelesen wurden
  if (result == ESP_OK && bytesRead > 0) {

    int samplesCount = bytesRead / 4;
    float sumSq = 0;

    // Verarbeitung aller Samples zur Energieberechnung
    for (int i = 0; i < samplesCount; i++) {

      // 24-bit Audio aus 32-bit Wert extrahieren (Bitshift)
      int32_t val = samples[i] >> 8;

      // Normierung auf Bereich [-1, 1]
      float floatSample = (float)val / 8388608.0;

      // Quadratische Leistung für RMS-Berechnung
      sumSq += floatSample * floatSample;
    }

    // Root Mean Square (effektiver Signalwert)
    float rms = sqrt(sumSq / samplesCount);

    // Umrechnung in logarithmische Dezibel-Skala
    float db = 20.0 * log10(rms + 1e-9);

    // Kalibrierter Schalldruckpegel
    float spl = db + DB_OFFSET;

    // Exponentielle Glättung zur Stabilisierung der Messwerte
    if (smoothedSPL == 0) {
      smoothedSPL = spl;
    } else {
      smoothedSPL =
          (spl * filterFactor) +
          (smoothedSPL * (1.0 - filterFactor));
    }

    return smoothedSPL;
  }

  return smoothedSPL;
}

// ================================================================
// Bestimmung der Schlafqualität anhand von Bewegung (PIR)
// ================================================================
String detectSleepQuality() {

  int motionCount = 0;

  // Mehrfachmessung zur zuverlässigeren Erkennung von Bewegung
  for (int i = 0; i < 10; i++) {

    // PIR-Sensor liefert HIGH bei erkannter Bewegung
    if (digitalRead(PIR_PIN) == HIGH) {
      motionCount++;
    }

    delay(200); // zeitliche Streuung der Messung
  }

  Serial.print("Bewegung erkannt: ");
  Serial.println(motionCount);

  // Einfache Klassifikation der Schlafqualität
  if (motionCount > 5)
    return "awake";      // starke Bewegung → wach

  if (motionCount > 2)
    return "restless";   // leichte Unruhe

  return "calm";         // kaum Bewegung → ruhiger Schlaf
}

// ================================================================
// HTTP POST Übertragung der Sensordaten an den Server
// ================================================================
void postData(String body) {

  HTTPClient http;

  // Verbindung zum API-Endpunkt herstellen
  http.begin(API_URL);

  // HTTP Header für Formular-Daten setzen
  http.addHeader(
      "Content-Type",
      "application/x-www-form-urlencoded");

  // Daten an Server senden
  int code = http.POST(body);

  // HTTP Statuscode ausgeben (Debugging)
  Serial.println("HTTP " + String(code));

  http.end();
}

// ================================================================
// Initialisierung (wird einmal beim Start ausgeführt)
// ================================================================
void setup() {

  // Serielle Schnittstelle für Debugging starten
  Serial.begin(115200);

  // Initialisierung der Sensoren
  dht.begin();
  setupI2S();

  // PIR Sensor als Eingang konfigurieren
  pinMode(PIR_PIN, INPUT);

  // WLAN im Station Mode starten
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);
  delay(100);

  // Verbindung zum WLAN aufbauen
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  Serial.print("Verbinde mit WLAN");

  // Warten bis Verbindung hergestellt ist
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  // Erfolgreiche Verbindung anzeigen
  Serial.println(
      "\nVerbunden: " +
      WiFi.localIP().toString());
}

// ================================================================
// Hauptschleife (läuft dauerhaft)
// ================================================================
void loop() {

  // Temperaturmessung (°C)
  float temp = dht.readTemperature();

  // Luftfeuchtigkeit (%)
  float hum = dht.readHumidity();

 // Schallpegel (0–100, relativ)
  float sound = readSoundLevel();

  // Schlafzustand basierend auf Bewegung
  String quality = detectSleepQuality();

  // Validierung der DHT11 Messwerte
  if (isnan(temp) || isnan(hum)) {

    Serial.println(
      "Fehler: DHT11 liefert keine gültigen Daten");

    delay(5000);
    return;
  }

  // Ausgabe aller Messwerte im seriellen Monitor
  Serial.printf(
      "Temp: %.1f°C | Hum: %.0f%% | Sound: %.1f dB | Schlaf: %s\n",
      temp,
      hum,
      sound,
      quality.c_str());

  // Datenübertragung nur bei bestehender WLAN-Verbindung
  if (WiFi.status() == WL_CONNECTED) {

    // Umweltdaten (Temperatur, Feuchtigkeit, Schall)
    postData(
      "type=environment"
      "&user_id=" + String(USER_ID) +
      "&temperature=" + String(temp, 1) +
      "&humidity=" + String(hum, 0) +
      "&sound_level=" + String(sound, 1));

    // Schlafanalyse (Bewegungszustand)
    postData(
      "type=sleep"
      "&user_id=" + String(USER_ID) +
      "&quality=" + quality);
  }

  // Wartezeit bis zur nächsten Messung
  delay(INTERVAL * 1000);
}
