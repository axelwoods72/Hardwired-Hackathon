const MELB_LAT = -37.814;
const MELB_LONG = 144.9631;

navigator.lat = MELB_LAT;
navigator.long = MELB_LONG;

async function getWeather() {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${navigator.lat}&longitude=${navigator.long}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,precipitation,wind_speed_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

    let data;
    try {
        const res = await fetch(url);
        data = await res.json();
        console.log("Successfully got weather data");
    } catch (error) {
        console.error("Could not get weather: ", error);
        return;
    }

    updateCurDisplay(data.current, data.current_units);
    updateForecast(data.daily, data.daily_units);
}

function updateCurDisplay(current, units) {
    document.getElementById("cur-temp").textContent = `Temperature: ${current.temperature_2m}${units.temperature_2m}`;
    document.getElementById("cur-humidity").textContent = `Humidity: ${current.relative_humidity_2m}${units.relative_humidity_2m}`;
    document.getElementById("cur-feels-like").textContent = `Feels like: ${current.apparent_temperature}${units.apparent_temperature}`;
    document.getElementById("cur-precipitation").textContent = `Precipitation: ${current.precipitation}${units.precipitation}`;
    document.getElementById("cur-wind").textContent = `Wind speed: ${current.wind_speed_10m}${units.wind_speed_10m}`;
    document.getElementById("cur-gusts").textContent = `Wind gusts: ${current.wind_gusts_10m}${units.wind_gusts_10m}`;
    const weatherCode = current.weather_code;
    const icon = wmoCodeToIcon(weatherCode);
    document.getElementById("cur-weather-icon").textContent = icon;

}

function wmoCodeToIcon(code) {
    if (code === 0) return "☀️";
    if (code <= 2) return "🌤️";
    if (code === 3) return "☁️";
    if (code === 45 || code === 48) return "🌫️";
    if (code >= 51 && code <= 57) return "🌦️";
    if (code >= 61 && code <= 67) return "🌧️";
    if (code >= 71 && code <= 77) return "🌨️";
    if (code >= 80 && code <= 82) return "🌧️";
    if (code >= 85 && code <= 86) return "🌨️";
    if (code >= 95) return "⛈️";
    return "Rare weather (Not supported)";
}

function updateForecast(daily, units) {
    const forecast_containers = document.querySelectorAll(".forecast-day-container");
    forecast_containers.forEach((box, i) => {
        box.querySelector(".forecast-weather-icon").textContent = wmoCodeToIcon(daily.weather_code[i]);
        box.querySelector(".forecast-high-temp").textContent = `${daily.temperature_2m_max[i]}${units.temperature_2m_max}`;
        box.querySelector(".forecast-low-temp").textContent = `${daily.temperature_2m_min[i]}${units.temperature_2m_min}`;
    });
}

getWeather();
let caller = setInterval(getWeather, 600000);