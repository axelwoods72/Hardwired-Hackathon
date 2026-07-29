// Food finder input bridge.
//
// App switching is owned by navigation.js (ESP32 WebSocket "nav" messages).
// This file only boots FoodFinder and routes the cabinet's six keys to it
// while the food-finder panel is the active app:
//   joystick  -> ArrowUp / ArrowDown / ArrowLeft / ArrowRight
//   A button  -> Enter   (select / confirm)
//   B button  -> Escape  (back / cancel)

const NAV_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'];

document.addEventListener('keydown', (e) => {
    if (!NAV_KEYS.includes(e.key)) return;
    const panel = document.getElementById('food-finder-app');
    if (!panel?.classList.contains('active')) return;
    e.preventDefault();
    FoodFinder.onKey(e.key);
});

document.addEventListener('DOMContentLoaded', () => {
    FoodFinder.init();

    window.ws?.addEventListener("message", (event) => {
        const msg = JSON.parse(event.data);
        const panel = document.getElementById('food-finder-app');
        if (!panel?.classList.contains('active')) return;

        if (msg.type === "sel") {
            FoodFinder.onKey('Enter');
        } else if (msg.type === "stick" && NAV_KEYS.includes(msg.direction)) {
            FoodFinder.onKey(msg.direction);
        } else if (msg.type === "sw") {
            FoodFinder.onKey('Escape');
        }
    });
});
