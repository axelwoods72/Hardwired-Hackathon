function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    document.getElementById('clock-app').textContent = timeString;
}

updateClock();
setInterval(updateClock, 1000);