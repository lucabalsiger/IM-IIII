// Sensor 2 — Geräusch & Schlafqualität
// Hardware: ESP32-C6 + KY-038 Schallsensor (analog) + MPU6050 (Bewegung via I2C)
// Libraries:
//   - "Adafruit MPU6050" von Adafruit (Library Manager)
//   - "Adafruit Unified Sensor" von Adafruit (Abhängigkeit)

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// ── Konfiguration ────────────────────────────────────────────────
const char* WIFI_SSID = "WLAN-NAME";
const char* WIFI_PASS = "WLAN-PASSWORT";

const char* API_URL   = "https://im4.lucabalsiger.ch/api/sensor.php";
const int   USER_ID   = 11;

const int   SOUND_PIN = 34;    // Analoger GPIO-Pin für KY-038 (A0)
const int   INTERVAL  = 300;   // Sekunden zwischen Messungen (5 Min)

// Schwellenwerte Bewegungserkennung (ggf. anpassen)
const float THRESHOLD_AWAKE    = 1.5;  // m/s² → wach
const float THRESHOLD_RESTLESS = 0.4;  // m/s² → unruhig
// ────────────────────────────────────────────────────────────────

Adafruit_MPU6050 mpu;

void setup() {
  Serial.begin(115200);

  if (!mpu.begin()) {
    Serial.println("MPU6050 nicht gefunden – Pins prüfen (SDA/SCL)");
    while (1) delay(10);
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_2_G);

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Verbinde mit WLAN");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nVerbunden: " + WiFi.localIP().toString());
}

String detectSleepQuality() {
  // 10 Messungen über 2 Sekunden → Durchschnitts-Beschleunigung
  float totalMovement = 0;
  const int samples = 10;

  for (int i = 0; i < samples; i++) {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    float magnitude = sqrt(
      pow(a.acceleration.x, 2) +
      pow(a.acceleration.y, 2) +
      pow(a.acceleration.z - 9.8, 2)
    );
    totalMovement += magnitude;
    delay(200);
  }

  float avg = totalMovement / samples;
  Serial.printf("Bewegung: %.2f m/s²\n", avg);

  if (avg > THRESHOLD_AWAKE)    return "awake";
  if (avg > THRESHOLD_RESTLESS) return "restless";
  return "calm";
}

int readSoundLevel() {
  // KY-038: mehrere Samples über 1 Sekunde → Spitzenwert
  // analogRead gibt 0–4095 zurück (ESP32 12-bit ADC)
  // Mapping auf dB-ähnliche Skala 0–100
  int peak = 0;
  for (int i = 0; i < 50; i++) {
    int val = analogRead(SOUND_PIN);
    if (val > peak) peak = val;
    delay(20);
  }
  return map(peak, 0, 4095, 0, 100);
}

void postData(String type, String body) {
  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  int code = http.POST(body);
  Serial.println(type + " → HTTP " + String(code));
  http.end();
}

void loop() {
  int    sound   = readSoundLevel();
  String quality = detectSleepQuality();

  Serial.printf("Geräusch: %d dB | Schlaf: %s\n", sound, quality.c_str());

  if (WiFi.status() == WL_CONNECTED) {
    postData("environment",
      "type=environment"
      "&user_id="     + String(USER_ID) +
      "&temperature=0"
      "&humidity=0"
      "&sound_level=" + String(sound)
    );

    postData("sleep",
      "type=sleep"
      "&user_id=" + String(USER_ID) +
      "&quality=" + quality
    );
  } else {
    Serial.println("WLAN getrennt – überspringe");
  }

  delay(INTERVAL * 1000);
}
