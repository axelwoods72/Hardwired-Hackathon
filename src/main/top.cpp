#include <Arduino.h>
#include <WiFi.h>
#include "FS.h"
#include <LittleFS.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <Arduino_JSON.h>

#include "config.h"

/**********************************************************************/
/* Defines */

// LED pins
#define LED_DATA_PIN 6
#define LED_CLOCK_PIN 2
#define LED_LATCH_PIN 4
// Button pins
#define NAV_BUTTON_PIN 35
#define SEL_BUTTON_PIN 37
// Joystick pins
#define VRX_PIN 8
#define VRY_PIN 10
#define SW_PIN 33
// RGB pins
#define RED_PIN 12
#define GREEN_PIN 14
#define BLUE_PIN 27

#define FORMAT_LITTLEFS_IF_FAILED true
#define STICK_DEADBAND 1500

/**********************************************************************/
/* Function prototypes */

void updateLEDs(byte pattern);
void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len);
void handleWebSocketMessage(void *arg, uint8_t *data, size_t len);
void handleNavButton();
void handleSelButton();
void handleJoyStick();
void celebrate();
void KnightRiderLEDs();
void save_food(JSONVar msg);
int calibrateStick(int pin);

/**********************************************************************/
/* Global vars */

const char *ssid = WIFI_SSID;
const char *password = WIFI_PASSWORD;

int nav_button_prev = HIGH;
int debounced_nav_curr = HIGH;
unsigned long last_nav_change = 0;

int sel_button_prev = HIGH;
int debounced_sel_curr = HIGH;
unsigned long last_sel_change = 0;

const unsigned short debounceDelay = 50;

int xCentre = 4000;
int yCentre = 4000;
String lastStickDirection = "none";

/**********************************************************************/

AsyncWebServer server(80);

AsyncWebSocket ws("/ws");

void setup()
{
  delay(2000);
  Serial.begin(115200);

  // setup filesystem
  if (!LittleFS.begin(FORMAT_LITTLEFS_IF_FAILED))
  {
    Serial.println("LittleFS Mount Failed");
    return;
  }

  // connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting");

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
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

  // Pins
  pinMode(LED_DATA_PIN, OUTPUT);
  pinMode(LED_CLOCK_PIN, OUTPUT);
  pinMode(LED_LATCH_PIN, OUTPUT);
  pinMode(NAV_BUTTON_PIN, INPUT_PULLUP);
  pinMode(SEL_BUTTON_PIN, INPUT_PULLUP);
  pinMode(SW_PIN, INPUT_PULLUP);

  pinMode(RED_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  pinMode(BLUE_PIN, OUTPUT);

  // Calibrate joystick
  delay(500);
  xCentre = calibrateStick(VRX_PIN);
  yCentre = calibrateStick(VRY_PIN);
}

void loop()
{
  // Inputs
  handleNavButton();
  handleSelButton();
  handleJoyStick();
}

/**********************************************************************/

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

/**********************************************************************/

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
    else if (type == "update_app")
    {
      update_app(msg);
    }
  }
}

/**********************************************************************/
/* Handle inputs */

void handleNavButton()
{
  int nav_button_curr = digitalRead(NAV_BUTTON_PIN);
  if (nav_button_curr != nav_button_prev)
  {
    last_nav_change = millis();
  }

  if ((millis() - last_nav_change) > debounceDelay)
  {
    if (nav_button_curr != debounced_nav_curr)
    {
      debounced_nav_curr = nav_button_curr;
      if (debounced_nav_curr == LOW)
      {
        Serial.println("Nav button pressed - cycling app");
        JSONVar obj;
        obj["type"] = "nav";
        ws.textAll(JSON.stringify(obj));
        // Print IP
        Serial.print("IP address: ");
        Serial.println(WiFi.localIP());
      }
    }
  }
  nav_button_prev = nav_button_curr;
}

void handleSelButton()
{
  int sel_button_curr = digitalRead(SEL_BUTTON_PIN);
  if (sel_button_curr != sel_button_prev)
  {
    last_sel_change = millis();
  }

  if ((millis() - last_sel_change) > debounceDelay)
  {
    if (sel_button_curr != debounced_sel_curr)
    {
      debounced_sel_curr = sel_button_curr;
      if (debounced_sel_curr == LOW)
      {
        Serial.println("sel button pressed");
        JSONVar obj;
        obj["type"] = "sel";
        ws.textAll(JSON.stringify(obj));
      }
    }
  }
  sel_button_prev = sel_button_curr;
}

void handleJoyStick()
{
  int xVal = analogRead(VRX_PIN);
  int yVal = analogRead(VRY_PIN);
  int delta_x = xVal - xCentre;
  int delta_y = yVal - yCentre;

  String stickDirection = "none";

  if (abs(delta_x) > STICK_DEADBAND || abs(delta_y) > STICK_DEADBAND)
  {
    if (abs(delta_x) > abs(delta_y))
    {
      stickDirection = delta_x > 0 ? "ArrowRight" : "ArrowLeft";
    }
    else
    {
      stickDirection = delta_y > 0 ? "ArrowUp" : "ArrowDown";
    }
  }

  if (stickDirection != "none" && stickDirection != lastStickDirection)
  {
    Serial.println("Joystick moved");
    JSONVar obj;
    obj["type"] = "stick";
    obj["direction"] = stickDirection;
    ws.textAll(JSON.stringify(obj));
  }
  lastStickDirection = stickDirection;
}

/**********************************************************************/

void celebrate()
{
  // tweak out
  KnightRiderLEDs();
}

void save_food(JSONVar msg)
{
}

void update_app(JSONVar msg)
{
  String cur_app = msg["app"];
  if (cur_app == "clock-app")
  {
    analogWrite(RED_PIN, 255);
    analogWrite(GREEN_PIN, 255);
    analogWrite(BLUE_PIN, 0);
  }

  else if (cur_app == "weather-app")
  {
    analogWrite(RED_PIN, 0);
    analogWrite(GREEN_PIN, 0);
    analogWrite(BLUE_PIN, 255);
  }

  else if (cur_app == "food-finder-app")
  {
    analogWrite(RED_PIN, 255);
    analogWrite(GREEN_PIN, 0);
    analogWrite(BLUE_PIN, 0);
  }

  else if (cur_app == "game-app")
  {
    analogWrite(RED_PIN, 255);
    analogWrite(GREEN_PIN, 0);
    analogWrite(BLUE_PIN, 255);
  }
}

/**********************************************************************/
/* LED sequences */

void updateLEDs(byte pattern)
{
  digitalWrite(LED_LATCH_PIN, LOW);
  shiftOut(LED_DATA_PIN, LED_CLOCK_PIN, LSBFIRST, pattern);
  digitalWrite(LED_LATCH_PIN, HIGH);
}

void KnightRiderLEDs()
{
  for (int j = 0; j < 3; j++)
  {
    for (int i = 0; i < 8; i++)
    {
      byte pattern = 1 << i;
      updateLEDs(pattern);
      delay(50);
    }
    for (int i = 6; i >= 1; i--)
    {
      byte pattern = 1 << i;
      updateLEDs(pattern);
      delay(50);
    }
  }
  updateLEDs(1);
  delay(50);
  updateLEDs(0);
}

/**********************************************************************/

int calibrateStick(int pin)
{
  int sum = 0;
  for (int i = 0; i < 20; i++)
  {
    sum += analogRead(pin);
    delay(5);
  }

  return sum / 20;
}