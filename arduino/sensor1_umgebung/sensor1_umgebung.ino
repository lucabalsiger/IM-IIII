// Sensor 1 — Temperatur, Luftfeuchtigkeit & Geräusch
// Hardware: ESP32-C6 + DHT11 (GPIO 4) + KY-038 Schallsensor (GPIO 34)
// Library: "DHT sensor library" von Adafruit (Arduino IDE Library Manager)

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// ── Konfiguration ────────────────────────────────────────────────
const char* WIFI_SSID = "WLAN-NAME";
const char* WIFI_PASS = "WLAN-PASSWORT";

const char* API_URL   = "https://im4.lucabalsiger.ch/api/sensor.php";
const int   USER_ID   = 11;

const int   DHT_PIN   = 4;    // GPIO-Pin des DHT11
const int   SOUND_PIN = 34;   // GPIO-Pin des KY-038 (analog)
const int   INTERVAL  = 300;  // Sekunden zwischen Messungen (5 Min)
// ────────────────────────────────────────────────────────────────

DHT dht(DHT_PIN, DHT11);

int readSoundLevel() {
  // 50 Samples über 1 Sekunde → Spitzenwert → 0–100 Skala
  int peak = 0;
  for (int i = 0; i < 50; i++) {
    int val = analogRead(SOUND_PIN);
    if (val > peak) peak = val;
    delay(20);
  }
  return map(peak, 0, 4095, 0, 100);
}

void setup() {
  Serial.begin(115200);
  dht.begin();

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
  float temp  = dht.readTemperature();
  float hum   = dht.readHumidity();
  int   sound = readSoundLevel();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("Fehler: DHT11 liefert keine Daten");
    delay(5000);
    return;
  }

  Serial.printf("Temp: %.1f°C | Hum: %.0f%% | Sound: %d\n", temp, hum, sound);

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/x-www-form-urlencoded");

    String body = "type=environment"
                  "&user_id="     + String(USER_ID) +
                  "&temperature=" + String(temp, 1) +
                  "&humidity="    + String(hum, 0) +
                  "&sound_level=" + String(sound);

    int code = http.POST(body);
    Serial.println("HTTP Response: " + String(code));
    http.end();
  } else {
    Serial.println("WLAN getrennt – überspringe");
  }

  delay(INTERVAL * 1000);
}
