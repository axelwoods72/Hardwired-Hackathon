// Food Fighter Pad — the ESP32 pretends to be a Bluetooth keyboard so the
// phone in the cabinet can be driven by the arcade joystick and buttons.
//
// Wiring: every joystick microswitch and button connects between its GPIO pin
// and GND. No resistors needed — the ESP32's internal pull-ups are enabled,
// so a pin reads HIGH at rest and LOW when pressed.
//
//   joystick up    -> GPIO 32      A button (select) -> GPIO 27
//   joystick down  -> GPIO 33      B button (back)   -> GPIO 14
//   joystick left  -> GPIO 25
//   joystick right -> GPIO 26
//   all switch commons -> GND
//
// The keys sent here are the web app's entire input contract
// (arrows + Enter + Escape). Change a pin? Only touch the table below.

#include <BleKeyboard.h>

BleKeyboard bleKeyboard("Food Fighter Pad", "Based Squad", 100);

const unsigned long DEBOUNCE_MS = 25;

struct Btn {
  uint8_t pin;
  uint8_t key;
  bool down;
  unsigned long lastChange;
};

Btn btns[] = {
  {32, KEY_UP_ARROW,    false, 0},
  {33, KEY_DOWN_ARROW,  false, 0},
  {25, KEY_LEFT_ARROW,  false, 0},
  {26, KEY_RIGHT_ARROW, false, 0},
  {27, KEY_RETURN,      false, 0},  // A: select
  {14, KEY_ESC,         false, 0},  // B: back
};

void setup() {
  for (Btn &b : btns) {
    pinMode(b.pin, INPUT_PULLUP);
  }
  bleKeyboard.begin();
}

void loop() {
  if (!bleKeyboard.isConnected()) {
    delay(100);
    return;
  }

  unsigned long now = millis();
  for (Btn &b : btns) {
    bool pressed = digitalRead(b.pin) == LOW;
    if (pressed != b.down && now - b.lastChange > DEBOUNCE_MS) {
      b.down = pressed;
      b.lastChange = now;
      if (pressed) {
        bleKeyboard.press(b.key);
      } else {
        bleKeyboard.release(b.key);
      }
    }
  }
  delay(5);
}
