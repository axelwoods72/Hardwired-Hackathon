#include <Arduino.h>
#include <WiFi.h>
#include "FS.h"
#include <LittleFS.h>
#include <ESPAsyncWebServer.h>

#include "config.h"

#define FORMAT_LITTLEFS_IF_FAILED true

const char* ssid = WIFI_SSID;
const char* password = WIFI_PASSWORD;

AsyncWebServer server(80);

void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600);

  // setup filesystem
  if(!LittleFS.begin(FORMAT_LITTLEFS_IF_FAILED)) {
    Serial.println("LittleFS Mount Failed");
    return;
  }

  // connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  // webpage server routing
  server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
  server.begin();
}

void loop() {
  // put your main code here, to run repeatedly:
  
}
