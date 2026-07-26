#include <Arduino.h>
#include <WiFi.h>
#include "FS.h"
#include <LittleFS.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <Arduino_JSON.h>
#include "esp_wpa2.h"

#include "config.h"

#define FORMAT_LITTLEFS_IF_FAILED true

#define NAV_BUTTON_PIN 21

// LED pin number
int LED1 = 13;
int LED2 = 12;
int LED3 = 27;
int LED4 = 26;

// RGB pin number
int REDpin = 12;
int GREENpin = 14;
int BLUEpin = 27;

// function declarations
void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len);
void handleWebSocketMessage(void *arg, uint8_t *data, size_t len);
void celebrate();
void save_food(JSONVar msg);
void cycleToNextApp();
void sendJoyStickInput(String direction);
void sendSelectButtonInput();
void update_app(JSONVar msg);

AsyncWebServer server(80);

AsyncWebSocket ws("/ws");

void setup()
{
  // put your setup code here, to run once:
  Serial.begin(9600);

  // LED outputs
  pinMode(LED1, OUTPUT);
  pinMode(LED2, OUTPUT);
  pinMode(LED3, OUTPUT);
  pinMode(LED4, OUTPUT);

  // RGB outputs
  pinMode(REDpin, OUTPUT);
  pinMode(GREENpin, OUTPUT);
  pinMode(BLUEpin, OUTPUT);

  // setup filesystem
  if (!LittleFS.begin(FORMAT_LITTLEFS_IF_FAILED))
  {
    Serial.println("LittleFS Mount Failed");
    return;
  }

  // connect to WiFi 
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting");
  unsigned long start = millis();

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
    if (millis() - start > 15000)
    {
      Serial.print("Failed to connect: ");
      Serial.println(WiFi.status());
      break;
    }
  }

  Serial.println("\nWiFi Connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  // setup websocket
  ws.onEvent(onEvent);
  server.addHandler(&ws);

  // webpage server routing
  server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
  server.begin();
}

void loop()
{
  // put your main code here, to run repeatedly:
  delay(5000);
  cycleToNextApp();
}

void cycleToNextApp() {
  JSONVar obj;
  obj["type"] = "nav";
  ws.textAll(JSON.stringify(obj));
}

void sendJoyStickInput(String direction) {
  JSONVar obj;
  obj["type"] = "joystick";
  obj["direction"] = direction;
  ws.textAll(JSON.stringify(obj));
}

void sendSelectButtonInput() {
  JSONVar obj;
  obj["type"] = "select";
  ws.textAll(JSON.stringify(obj));
}

void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      Serial.printf("WebSocket client #%u connected from %s\n", client->id(), client->remoteIP().toString().c_str());
      break;
    case WS_EVT_DISCONNECT:
      Serial.printf("WebSocket client #%u disconnected\n", client->id());
      break;
    case WS_EVT_DATA:
      // received msg through websocket
      handleWebSocketMessage(arg, data, len);
      break;
    case WS_EVT_PONG:
    case WS_EVT_ERROR:
      break;
  }
}

void handleWebSocketMessage(void *arg, uint8_t *data, size_t len)
{
  AwsFrameInfo *info = (AwsFrameInfo *)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT)
  {
    data[len] = 0;
    String msg_str = (char *)data;
    JSONVar msg = JSON.parse(msg_str);
    String type = msg["type"];
    if (type == "food_chosen") {
      celebrate();
    } else if (type == "save_food") {
      save_food(msg);
    } else if (type == "update_app") {
      update_app(msg);
    }
  }
}

void celebrate()
{
  // tweak out
  for (int i = 0; i < 3; i++)
  {
    digitalWrite(LED1, HIGH);
    delay(100);
    digitalWrite(LED1, LOW);

    digitalWrite(LED2, HIGH);
    delay(200);
    digitalWrite(LED2, LOW);

    digitalWrite(LED3, HIGH);
    delay(300);
    digitalWrite(LED3, LOW);

    digitalWrite(LED4, HIGH);
    delay(400);
    digitalWrite(LED4, LOW);
  }
}

void save_food(JSONVar msg) {

}

void update_app(JSONVar msg) {
  String cur_app = msg["app"];
  if (cur_app == "clock-app") {
  analogWrite(REDpin, 255);
	analogWrite(GREENpin, 255);
	analogWrite(BLUEpin, 0);
  }

  else if (cur_app == "weather-app") {
    analogWrite(REDpin, 0);
    analogWrite(GREENpin, 0);
    analogWrite(BLUEpin, 255);
  }

  else if (cur_app == "food-finder-app") {
    analogWrite(REDpin, 255);
    analogWrite(GREENpin, 0);
    analogWrite(BLUEpin, 0);
  }

  else if (cur_app == "game-app") {
    analogWrite(REDpin, 255);
    analogWrite(GREENpin, 0);
    analogWrite(BLUEpin, 255);
  }
}