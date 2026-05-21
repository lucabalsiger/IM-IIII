// Sensor Komplett — Temperatur, Luftfeuchtigkeit, Bewegung und Geräusche
// Hardware: ESP32-C6 + DHT11 (GPIO 3) + INMP441 (GPIO 8) + PIR-Sensor SR602 (GPIO 7)
// Libraries (Arduino IDE → Manage Libraries):
//   - "DHT sensor library" von Adafruit
//   - "Adafruit Unified Sensor" von Adafruit

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <driver/i2s.h>
#include <math.h>

// ── Konfiguration ────────────────────────────────────────────────
const char* WIFI_SSID = "WLAN-NAME";
const char* WIFI_PASS = "WLAN-PASSWORT";

const char* API_URL   = "https://im4.lucabalsiger.ch/api/sensor.php";
const int   USER_ID   = 11;

const int   DHT_PIN   = 3;
const int   PIR_PIN   = 7;   // 👀 PIR Sensor
const int   INTERVAL  = 30;

// 🎤 INMP441 Pins
#define I2S_WS   23
#define I2S_SD   13
#define I2S_SCK  8
#define I2S_PORT I2S_NUM_0

// ────────────────────────────────────────────────────────────────

DHT dht(DHT_PIN, DHT11);

// 🎤 Audio Buffer
#define BUFFER_SIZE 512
int32_t samples[BUFFER_SIZE];

// 🎤 Sound Verarbeitung
float smoothedSPL = 0;
const float filterFactor = 0.5;
const float DB_OFFSET = 110.0;

// ── I2S Setup ───────────────────────────────────────────────────
void setupI2S() {
  i2s_config_t config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 16000,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 1024,
    .use_apll = false
  };

  i2s_pin_config_t pins = {
    .mck_io_num = I2S_PIN_NO_CHANGE,
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = I2S_SD
  };

  i2s_driver_install(I2S_PORT, &config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pins);
  i2s_zero_dma_buffer(I2S_PORT);
}

// 🎤 Sound messen
float readSoundLevel() {
  size_t bytesRead = 0;

  esp_err_t result = i2s_read(I2S_PORT, &samples, sizeof(samples), &bytesRead, portMAX_DELAY);

  if (result == ESP_OK && bytesRead > 0) {

    int samplesCount = bytesRead / 4;
    float sumSq = 0;

    for (int i = 0; i < samplesCount; i++) {
      int32_t val = samples[i] >> 8;
      float floatSample = (float)val / 8388608.0;
      sumSq += floatSample * floatSample;
    }

    float rms = sqrt(sumSq / samplesCount);
    float db = 20.0 * log10(rms + 1e-9);
    float spl = db + DB_OFFSET;

    if (smoothedSPL == 0) {
      smoothedSPL = spl;
    } else {
      smoothedSPL = (spl * filterFactor) + (smoothedSPL * (1.0 - filterFactor));
    }

    return smoothedSPL;
  }

  return smoothedSPL;
}

// 👀 PIR Schlafanalyse
String detectSleepQuality() {
  int motionCount = 0;

  for (int i = 0; i < 10; i++) {
    if (digitalRead(PIR_PIN) == HIGH) {
      motionCount++;
    }
    delay(200);
  }

  Serial.print("Bewegung erkannt: ");
  Serial.println(motionCount);

  if (motionCount > 5) return "awake";
  if (motionCount > 2) return "restless";
  return "calm";
}

// ── HTTP ───────────────────────────────────────────────────────
void postData(String body) {
  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");

  int code = http.POST(body);
  Serial.println("HTTP " + String(code));

  http.end();
}

// ── SETUP ──────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  dht.begin();
  setupI2S();

  pinMode(PIR_PIN, INPUT);   // 👀 PIR aktivieren

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);
  delay(100);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  Serial.print("Verbinde mit WLAN");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nVerbunden: " + WiFi.localIP().toString());
}

// ── LOOP ───────────────────────────────────────────────────────
void loop() {

  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();
  float sound = readSoundLevel();
  String quality = detectSleepQuality();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("Fehler: DHT11 liefert keine Daten");
    delay(5000);
    return;
  }

  Serial.printf("Temp: %.1f°C | Hum: %.0f%% | Sound: %.1f dB | Schlaf: %s\n",
                temp, hum, sound, quality.c_str());

  if (WiFi.status() == WL_CONNECTED) {

    postData("type=environment"
             "&user_id="     + String(USER_ID) +
             "&temperature=" + String(temp, 1) +
             "&humidity="    + String(hum, 0) +
             "&sound_level=" + String(sound, 1));

    postData("type=sleep"
             "&user_id=" + String(USER_ID) +
             "&quality=" + quality);
  }

  delay(INTERVAL * 1000);
}
