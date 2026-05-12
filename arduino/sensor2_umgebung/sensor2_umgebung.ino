// Sensor 2 — Temperatur & Luftfeuchtigkeit (Umgebung)
// Hardware: ESP32-C6 + DHT11
// Library: "DHT sensor library" von Adafruit (Arduino IDE Library Manager)

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// ── Konfiguration ────────────────────────────────────────────────
const char* WIFI_SSID = "WLAN-NAME";
const char* WIFI_PASS = "WLAN-PASSWORT";

const char* API_URL   = "https://im4.lucabalsiger.ch/api/sensor_write.php";
const int   USER_ID   = 11;

const int   DHT_PIN   = 4;     // GPIO-Pin des DHT11
const int   INTERVAL  = 300;   // Sekunden zwischen Messungen (5 Min)
// ────────────────────────────────────────────────────────────────

DHT dht(DHT_PIN, DHT11);

void setup() {
  Serial.begin(115200);
  dht.begin();

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Verbinde mit WLAN");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nVerbunden: " + WiFi.localIP().toString());
}

void loop() {
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("Fehler: DHT11 liefert keine Daten");
    delay(5000);
    return;
  }

  Serial.printf("Temp: %.1f°C | Hum: %.0f%%\n", temp, hum);

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/x-www-form-urlencoded");

    String body = "type=environment"
                  "&user_id="     + String(USER_ID) +
                  "&temperature=" + String(temp, 1) +
                  "&humidity="    + String(hum, 0) +
                  "&sound_level=0";

    int code = http.POST(body);
    Serial.println("HTTP Response: " + String(code));
    http.end();
  } else {
    Serial.println("WLAN getrennt – überspringe");
  }

  delay(INTERVAL * 1000);
}
