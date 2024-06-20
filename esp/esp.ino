#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include "TimeLib.h"

const char* ssid = "";
const char* password = "";
const char* api = "";
const int pirPin = D12;
const int ledPin = D13;

String timestampStart;
String timestampEnd;
int pirState = LOW;
bool ledStatus = false;

WiFiClient client;
WiFiUDP ntpUDP;
HTTPClient http;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, 60000); 

String createTimestamp(int yearV, int monthV, int dayV, int hourV, int minuteV, int secondV) {
   return String(yearV) + "-" +
                     (monthV < 10 ? "0" : "") + String(monthV) + "-" + 
                     (dayV < 10 ? "0" : "") + String(dayV) + "T" + 
                     (hourV < 10 ? "0" : "") + String(hourV) + ":" + 
                     (minuteV < 10 ? "0" : "") + String(minuteV) + ":" + 
                     (secondV < 10 ? "0" : "") + String(secondV) + "Z";
}

void setup() {
  pinMode(pirPin, INPUT);
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);

  Serial.begin(115200);
  Serial.println("Sistema iniciado. Aguardando detecção de movimento...");
  
  WiFi.begin(ssid, password);
  Serial.print("Conectando-se a ");
  Serial.println(ssid);

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi conectado.");
  Serial.print("Endereço IP: ");
  Serial.println(WiFi.localIP());
  timeClient.begin();
  http.begin(client, api);
}

void loop() {
  timeClient.update();
  pirState = digitalRead(pirPin);

  unsigned long unixTime = timeClient.getEpochTime();

  if (unixTime == 0) {
    Serial.println("Failed to get NTP time");
    return;
  }

  setTime(unixTime);
  int yearV = year();  int monthV = month();  int dayV = day();  int hourV = hour();  int minuteV = minute();  int secondV = second();
  
  if (pirState == HIGH) {
    digitalWrite(ledPin, HIGH);
    ledStatus = true;
    timestampStart = createTimestamp(yearV, monthV, dayV, hourV, minuteV, secondV);
    Serial.println("Movimento detectado! LED Ligado.");
  } else {
    digitalWrite(ledPin, LOW);
    Serial.println("Sem movimento. LED Desligado.");  
    if (ledStatus) {
      timestampEnd = createTimestamp(yearV, monthV, dayV, hourV, minuteV, secondV);
      http.addHeader("Content-Type", "application/json");
      String jsonData = "{\"turnedOnAt\":\"" + timestampStart + "\",\"turnedOffAt\":\"" + timestampEnd + "\"}";
      int httpCode = http.POST(jsonData);; // Make the request

      if (httpCode > 0) { // Check for the returning code
        String response = http.getString();
        Serial.println("HTTP Response code: " + String(httpCode));
        Serial.println("Response: " + response);
      } else {
        Serial.println("Error on HTTP request");
      }

      Serial.println(timestampStart);
      Serial.println(timestampEnd);
    }

    ledStatus = false;
  }
  delay(3000);
}
