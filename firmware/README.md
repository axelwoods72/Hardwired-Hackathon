# Food Fighter Pad — ESP32 firmware

Turns the ESP32 into a Bluetooth keyboard. The joystick sends arrow keys, the
A button sends Enter, the B button sends Escape — exactly the six keys the web
app listens for, so pairing the pad is all it takes.

## Setup (Arduino IDE)

1. Install the **ESP32 board package**: File → Preferences → paste
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
   into "Additional boards manager URLs", then Tools → Board → Boards Manager →
   install "esp32 by Espressif Systems".
   **If the sketch won't compile, install version 2.0.17** (the BLE keyboard
   library lags behind the 3.x cores).
2. Install the **ESP32-BLE-Keyboard library** (it is NOT in the library
   manager): download the ZIP from
   <https://github.com/T-vK/ESP32-BLE-Keyboard/releases>, then
   Sketch → Include Library → Add .ZIP Library.
3. Tools → Board → **ESP32 Dev Module**, pick the right COM port,
   open `food_fighter_pad/food_fighter_pad.ino`, upload.

## Wiring

Every switch goes between its GPIO pin and GND — no resistors, the sketch
enables internal pull-ups. An arcade joystick is just four microswitches.

| control        | GPIO | sends      |
|----------------|------|------------|
| joystick up    | 32   | ArrowUp    |
| joystick down  | 33   | ArrowDown  |
| joystick left  | 25   | ArrowLeft  |
| joystick right | 26   | ArrowRight |
| A button       | 27   | Enter      |
| B button       | 14   | Escape     |
| all commons    | GND  |            |

## Pairing with the iPhone

1. Power the ESP32 (battery or USB).
2. iPhone: Settings → Bluetooth → pair **"Food Fighter Pad"**.
3. Sanity check: open Notes and wiggle the joystick — the cursor should move.
4. Open the food finder in Safari; the joystick now drives it.

Tip: iOS may show an on-screen-keyboard-hidden state while a hardware
keyboard is connected — that is expected and harmless here.
