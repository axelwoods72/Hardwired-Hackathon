// App shell: owns the clock, which app is visible, and all input.
//
// The ESP32 will pair with the phone as a Bluetooth keyboard, so the entire UI
// must be drivable with only these six keys (the "input contract"):
//   joystick  -> ArrowUp / ArrowDown / ArrowLeft / ArrowRight
//   A button  -> Enter   (select / confirm)
//   B button  -> Escape  (back / cancel)
// Never handle any other key, and never require a mouse.

const AppShell = {
    apps: {},        // id -> { title, onKey(key), onShow() }
    activeId: null,

    register(id, app) {
        this.apps[id] = app;
    },

    switchTo(id) {
        if (!this.apps[id]) return;
        this.activeId = id;
        document.querySelectorAll('.app-function > div')
            .forEach(el => el.classList.toggle('active', el.id === id));
        document.getElementById('active-app-title').textContent = this.apps[id].title;
        this.apps[id].onShow?.();
    },
};

const NAV_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'];

document.addEventListener('keydown', (e) => {
    if (!NAV_KEYS.includes(e.key)) return;
    e.preventDefault();    // arrows must never scroll the page inside the cabinet
    AppShell.apps[AppShell.activeId]?.onKey(e.key);
});

function startClock() {
    const el = document.getElementById('time-header');
    const tick = () => {
        el.textContent = new Date().toLocaleTimeString('en-AU',
            { hour: '2-digit', minute: '2-digit', hour12: false });
    };
    tick();
    setInterval(tick, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    startClock();

    // Tapping the header icons still works, as a touch fallback during dev.
    document.querySelectorAll('.app-box[data-app]').forEach(box => {
        box.addEventListener('click', () => AppShell.switchTo(box.dataset.app));
    });

    FoodFinder.init();
    AppShell.register('food-finder-app', FoodFinder);
    AppShell.register('clock-app', { title: 'clock', onKey() {} });
    AppShell.register('weather-app', { title: 'weather', onKey() {} });
    AppShell.switchTo('food-finder-app');
});
