// Sensor 2 — Schlafqualität via Bewegungserkennung
// Hardware: ESP32-C6 + MPU6050 (I2C: SDA=GPIO 21, SCL=GPIO 22)
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

const int   INTERVAL  = 300;  // Sekunden zwischen Messungen (5 Min)

const float THRESHOLD_AWAKE    = 1.5;  // m/s² → wach
const float THRESHOLD_RESTLESS = 0.4;  // m/s² → unruhig
// ────────────────────────────────────────────────────────────────

Adafruit_MPU6050 mpu;

String detectSleepQuality() {
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

void setup() {
  Serial.begin(115200);

  if (!mpu.begin()) {
    Serial.println("MPU6050 nicht gefunden – Pins prüfen (SDA/SCL)");
    while (1) delay(10);
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_2_G);

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

void loop() {
  String quality = detectSleepQuality();
  Serial.println("Schlafqualität: " + quality);

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/x-www-form-urlencoded");

    String body = "type=sleep"
                  "&user_id=" + String(USER_ID) +
                  "&quality=" + quality;

    int code = http.POST(body);
    Serial.println("HTTP Response: " + String(code));
    http.end();
  } else {
    Serial.println("WLAN getrennt – überspringe");
  }

  delay(INTERVAL * 1000);
}
