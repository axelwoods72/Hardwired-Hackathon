#include <Arduino.h>
#include <WiFi.h>
#include "FS.h"
#include <LittleFS.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <Arduino_JSON.h>

#include "config.h"

int LED1 = 13;
int LED2 = 12;
int LED3 = 27;
int LED4 = 26;

void setup() {
  // put your setup code here, to run once:
  pinMode(LED1, OUTPUT);
  pinMode(LED2, OUTPUT);
  pinMode(LED3, OUTPUT);
  pinMode(LED4, OUTPUT);

  
}

void loop() {
  // put your main code here, to run repeatedly:
  for (int i=0; i<3; i++) {
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