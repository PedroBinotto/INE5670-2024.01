#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

const char* ssid = "";
const char* password = "";
const char* api = "http://0.0.0.0:8000/api";

const int pirPin = D12;
const int ledPin = D13;

WiFiClient client;

int pirState = LOW;
String ledStatus = "Desligado";

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
}

void loop() {
  pirState = digitalRead(pirPin);
  HTTPClient http;
  http.begin(client, api);
  int httpCode = http.GET(); // Make the request

  if (httpCode > 0) { // Check for the returning code
    String payload = http.getString(); // Get the request response payload
    Serial.println(httpCode); // Print HTTP return code
    Serial.println(payload); // Print request response payload
  } else {
    Serial.println("Error on HTTP request");
  }
    
  http.end();

  if (pirState == HIGH) {
    digitalWrite(ledPin, HIGH);
    ledStatus = "Ligado";
    Serial.println("Movimento detectado! LED Ligado.");
  } else {
    digitalWrite(ledPin, LOW);
    ledStatus = "Desligado";
    Serial.println("Sem movimento. LED Desligado.");
  }
  delay(3000);
}
