const SLEEP_DELAY = 60000; // one minute
let sleepTimer;

window.addEventListener('load', onWindowLoad);

function onWindowLoad() {
    window.ws?.addEventListener("message", (event) => {
        resetSleepTimer();
        const msg = JSON.parse(event.data);
        if (msg.type === "sleep") {
            goAwake(msg);
        }
    });
}

function sleepToggle(msg) {
    if (document.body.classList.contains("asleep")) {
        goAwake();
    } else {
        goSleep();
    }
}

function goSleep() {
    document.body.classList.add("asleep");
    const msg = {
        type: "sleep"
    }
    ws.send(JSON.stringify(msg));
}

function goAwake() {
    document.body.classList.remove("asleep");
}

function resetSleepTimer() {
    clearTimeout(sleepTimer);
    sleepTimer = setTimeout(goSleep, SLEEP_DELAY);
}