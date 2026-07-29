const SLEEP_DELAY = 30000; // 30 seconds
let sleepTimer;

document.addEventListener('DOMContentLoaded', () => {
    window.ws?.addEventListener("message", (event) => {
        resetSleepTimer();
        const msg = JSON.parse(event.data);
        if (msg.type === "sleep" && document.getElementById("sleep-overlay").classList.contains("asleep")) {
            goAwake();
        } else if (msg.type === "reset") {
            goSleep();
        }
    });
});

function sleepToggle(msg) {
    if (document.body.classList.contains("asleep")) {
        goAwake();
    } else {
        goSleep();
    }
}

function goSleep() {
    document.getElementById("sleep-overlay").classList.add("asleep");
    const msg = {
        type: "sleep"
    }
    ws.send(JSON.stringify(msg));
}

function goAwake() {
    document.getElementById("sleep-overlay").classList.remove("asleep");
    console.log("Waking Up");
}

function resetSleepTimer() {
    clearTimeout(sleepTimer);
    sleepTimer = setTimeout(goSleep, SLEEP_DELAY);
}