var gateway = `ws://${window.location.hostname}/ws`

const app_cycle = ["clock-app", "weather-app", "food-finder-app", "game-select-app"];
const active_app_title = ["Clock", "Weather", "Food Finder", "Game"];
var cur_app = 0;

document.addEventListener('DOMContentLoaded', onLoad);

const switchSound = new Audio('media/retro-hurt.mp3');

function onLoad() {
    initWebSocket();

    var initial_active_menu_box = document.querySelector(".app-box");
    initial_active_menu_box.classList.add("current");
    var initial_active_app = document.getElementById(app_cycle[cur_app]);
    initial_active_app.classList.add("active");
    document.getElementById("active-app-title").textContent = active_app_title[cur_app];
    const top_time_display = document.getElementById("clock-hm");
    top_time_display.classList.toggle("hide", cur_app == 0);

    switchSound.volume = 0.2;

    // Browser testing (no ESP32): Tab cycles apps; click a menu icon to jump.
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            cycle_app();
        }
    });
    document.querySelectorAll('.app-box').forEach((box, i) => {
        box.style.cursor = 'pointer';
        box.addEventListener('click', () => jump_to_app(i));
    });
}

function initWebSocket() {
    window.ws = new WebSocket(gateway);
    var ws = window.ws;

    ws.addEventListener("open", (event) => {
        console.log("Connected to /ws");
    });

    ws.addEventListener("message", (event) => {
        const msg = JSON.parse(event.data);
        console.log("Message from ESP32 Server: ", event.data);
        if (msg.type === "nav") {
            cycle_app();
        } else if (msg.type === "reset") {
            reset_app_cycle();
        }
    });

    ws.addEventListener("close", (event) => {
        console.log("Connection to /ws closed");
    });
}

function jump_to_app(index) {
    if (index === cur_app || index < 0 || index >= app_cycle.length) return;
    // Walk cycle_app so LED / onShow side-effects stay consistent.
    const steps = (index - cur_app + app_cycle.length) % app_cycle.length;
    for (let n = 0; n < steps; n++) cycle_app();
}

function cycle_app() {
    switchSound.currentTime = 0;
    switchSound.play().catch(() => {});

    // deactivate old app
    var cur_app_element = document.getElementById(app_cycle[cur_app]);
    cur_app_element.classList.remove("active");

    // cycle to next app
    cur_app = (cur_app + 1) % app_cycle.length;

    // activate new app
    cur_app_element = document.getElementById(app_cycle[cur_app]);
    cur_app_element.classList.add("active");
    document.getElementById("active-app-title").textContent = active_app_title[cur_app];

    // update header menu
    const menu_boxes = document.querySelectorAll(".app-box");
    menu_boxes.forEach((box, i) => {
        box.classList.toggle("current", i === cur_app);
    });

    const top_time_display = document.getElementById("clock-hm");
    top_time_display.classList.toggle("hide", cur_app == 0);

    if (app_cycle[cur_app] === "food-finder-app" && typeof FoodFinder !== "undefined") {
        FoodFinder.onShow?.();
    }

    // send msg to esp32 to change LED color (skip when testing in browser)
    if (window.ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "update_app", app: app_cycle[cur_app] }));
    }
    msg_obj["app"] = app_cycle[cur_app];
    ws.send(JSON.stringify(msg_obj));
}

function reset_app_cycle() {
    cur_app = 0;

    const menu_boxes = document.querySelectorAll(".app-box");
    menu_boxes.forEach((box, i) => {
        box.classList.toggle("current", i === cur_app);
    });

    for (let i = 1; i < app_cycle.length; i++) {
        const app = document.getElementById(app_cycle[i]);
        app.classList.remove("active");
    }
    const app = document.getElementById(app_cycle[cur_app]);
    app.classList.add("active");

    const top_time_display = document.getElementById("clock-hm");
    top_time_display.classList.toggle("hide", cur_app == 0);
}