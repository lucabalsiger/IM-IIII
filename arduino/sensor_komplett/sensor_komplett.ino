// Sensor Komplett — Umgebung & Schlafqualität
// Hardware: ESP32-C6 + DHT11 (GPIO 4) + KY-038 (GPIO 34) + MPU6050 (SDA=21, SCL=22)
// Libraries (Arduino IDE → Manage Libraries):
//   - "DHT sensor library" von Adafruit
//   - "Adafruit MPU6050" von Adafruit
//   - "Adafruit Unified Sensor" von Adafruit

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// ── Konfiguration ────────────────────────────────────────────────
const char* WIFI_SSID = "WLAN-NAME";
const char* WIFI_PASS = "WLAN-PASSWORT";

const char* API_URL   = "https://im4.lucabalsiger.ch/api/sensor.php";
const int   USER_ID   = 11;

const int   DHT_PIN   = 4;    // DHT11 Data
const int   SOUND_PIN = 34;   // KY-038 Analog
const int   INTERVAL  = 300;  // Sekunden zwischen Messungen (5 Min)

const float THRESHOLD_AWAKE    = 1.5;
const float THRESHOLD_RESTLESS = 0.4;
// ────────────────────────────────────────────────────────────────

DHT dht(DHT_PIN, DHT11);
Adafruit_MPU6050 mpu;

int readSoundLevel() {
  int peak = 0;
  for (int i = 0; i < 50; i++) {
    int val = analogRead(SOUND_PIN);
    if (val > peak) peak = val;
    delay(20);
  }
  return map(peak, 0, 4095, 0, 100);
}

String detectSleepQuality() {
  float totalMovement = 0;
  for (int i = 0; i < 10; i++) {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);
    totalMovement += sqrt(
      pow(a.acceleration.x, 2) +
      pow(a.acceleration.y, 2) +
      pow(a.acceleration.z - 9.8, 2)
    );
    delay(200);
  }
  float avg = totalMovement / 10;
  Serial.printf("Bewegung: %.2f m/s²\n", avg);
  if (avg > THRESHOLD_AWAKE)    return "awake";
  if (avg > THRESHOLD_RESTLESS) return "restless";
  return "calm";
}

void postData(String body) {
  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  int code = http.POST(body);
  Serial.println("HTTP " + String(code));
  http.end();
}

void setup() {
  Serial.begin(115200);
  dht.begin();

  if (!mpu.begin()) {
    Serial.println("MPU6050 nicht gefunden – Pins prüfen!");
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
  float  temp    = dht.readTemperature();
  float  hum     = dht.readHumidity();
  int    sound   = readSoundLevel();
  String quality = detectSleepQuality();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("Fehler: DHT11 liefert keine Daten");
    delay(5000);
    return;
  }

  Serial.printf("Temp: %.1f°C | Hum: %.0f%% | Sound: %d | Schlaf: %s\n",
                temp, hum, sound, quality.c_str());

  if (WiFi.status() == WL_CONNECTED) {
    postData("type=environment"
             "&user_id="     + String(USER_ID) +
             "&temperature=" + String(temp, 1) +
             "&humidity="    + String(hum, 0) +
             "&sound_level=" + String(sound));

    postData("type=sleep"
             "&user_id=" + String(USER_ID) +
             "&quality=" + quality);
  } else {
    Serial.println("WLAN getrennt – überspringe");
  }

  delay(INTERVAL * 1000);
}
