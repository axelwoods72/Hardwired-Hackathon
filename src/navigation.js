var gateway = `ws://${window.location.hostname}/ws`

const app_cycle = ["clock-app", "weather-app", "food-finder-app", "game-app"];
const active_app_title = ["Clock", "Weather", "Food Finder", "Game"];
var cur_app = 0;

document.addEventListener('DOMContentLoaded', onLoad);

const switchSound = new Audio('media/retro-hurt.mp3');

function onLoad() {
    initWebSocket();

    var initial_active_app = document.getElementById(app_cycle[cur_app]);
    initial_active_app.classList.add("active");
    document.getElementById("active-app-title").textContent = active_app_title[cur_app];

    switchSound.volume = 0.2;
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
        }
    });

    ws.addEventListener("close", (event) => {
        console.log("Connection to /ws closed");
    });
}

function cycle_app() {
    switchSound.currentTime = 0;
    switchSound.play();

    // deactivate old app
    var cur_app_element = document.getElementById(app_cycle[cur_app]);
    cur_app_element.classList.remove("active");

    // cycle to next app
    cur_app = (cur_app + 1) % app_cycle.length;

    // activate new app
    cur_app_element = document.getElementById(app_cycle[cur_app]);
    cur_app_element.classList.add("active");
    document.getElementById("active-app-title").textContent = active_app_title[cur_app];
}