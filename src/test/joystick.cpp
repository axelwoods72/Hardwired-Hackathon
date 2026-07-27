#include <Arduino.h>

#define VRX_PIN 8
#define VRY_PIN 10
#define SW_PIN 34

void setup()
{
    Serial.begin(115200);
    pinMode(SW_PIN, INPUT_PULLUP);
}

void loop()
{
    int xVal = analogRead(VRX_PIN);
    int yVal = analogRead(VRY_PIN);
    int swVal = digitalRead(SW_PIN);

    Serial.print("X: ");
    Serial.printf("%6d", xVal);
    Serial.print("  Y: ");
    Serial.printf("%6d", yVal);
    Serial.print("  SW: ");
    Serial.println(swVal);

    delay(100);
}
