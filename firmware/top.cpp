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

// function declarations
void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len);
void handleWebSocketMessage(void *arg, uint8_t *data, size_t len);
void celebrate();
void save_food(JSONVar msg);

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

  // setup filesystem
  if (!LittleFS.begin(FORMAT_LITTLEFS_IF_FAILED))
  {
    Serial.println("LittleFS Mount Failed");
    return;
  }

  // connect to WiFi
  if (USE_EDUROAM)
  {
    WiFi.disconnect(true, true);
    WiFi.mode(WIFI_STA);

    esp_wifi_sta_wpa2_ent_set_identity((uint8_t *)IDENTITY, strlen(IDENTITY));
    esp_wifi_sta_wpa2_ent_set_username((uint8_t *)USERNAME, strlen(USERNAME));
    esp_wifi_sta_wpa2_ent_set_password((uint8_t *)UNI_PASSWORD, strlen(UNI_PASSWORD));
    esp_wifi_sta_wpa2_ent_enable();

    WiFi.begin(UNI_SSID);
  }
  else
  {
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }

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
  JSONVar obj;
  obj["type"] = "nav";
  ws.textAll(JSON.stringify(obj));
}

void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len)
{
  switch (type)
  {
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
    if (type == "food_chosen")
    {
      celebrate();
    }
    else if (type == "save_food")
    {
      save_food(msg);
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

void save_food(JSONVar msg)
{
}