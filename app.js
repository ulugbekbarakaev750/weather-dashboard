const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

// ⚠️ НИКАКОГО API-КЛЮЧА! Запрос идёт через прокси бота
// Для демо используем Open-Meteo (бесплатный, без ключа)
// В продакшене замени на fetch('/api/weather?city=...') к своему серверу

const els = {
    city: document.getElementById('city-name'),
    temp: document.getElementById('current-temp'),
    desc: document.getElementById('weather-description'),
    wind: document.getElementById('wind-speed'),
    humidity: document.getElementById('humidity'),
    pressure: document.getElementById('pressure'),
    input: document.getElementById('search-input'),
    btn: document.getElementById('search-btn'),
    bg: document.getElementById('body-bg'),
    log: document.getElementById('log-container'),
    total: document.getElementById('total-requests'),
    topCity: document.getElementById('top-city'),
};

let chart = null, totalReqs = 0, cityCounts = {};

function addLog(msg) {
    const div = document.createElement('div');
    div.className = 'mb-1';
    div.innerHTML = `<span class="opacity-50">[${new Date().toLocaleTimeString()}]</span> ${msg}`;
    els.log.appendChild(div);
    els.log.scrollTop = els.log.scrollHeight;
}

function updateStats(city) {
    totalReqs++;
    els.total.innerText = totalReqs;
    cityCounts[city] = (cityCounts[city] || 0) + 1;
    const top = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0];
    els.topCity.innerText = top ? top[0] : '-';
}

function changeTheme(id) {
    els.bg.classList.remove('theme-sunny', 'theme-rainy', 'theme-cloudy');
    if (id >= 200 && id < 600) els.bg.classList.add('theme-rainy');
    else if (id >= 600 && id < 800) els.bg.classList.add('theme-cloudy');
    else if (id === 800) els.bg.classList.add('theme-sunny');
    else els.bg.classList.add('theme-cloudy');
}

// 🔒 Используем Open-Meteo (НЕ требует ключа) вместо OpenWeatherMap
async function fetchWeather(city) {
    tg.MainButton.setText("⏳ Загрузка...");
    tg.MainButton.show();

    try {
        // Геокодинг
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ru`);
        const geoData = await geoRes.json();
        if (!geoData.results?.length) throw new Error('Город не найден');

        const { latitude, longitude, name } = geoData.results[0];

        // Погода
        const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code&timezone=auto`);
        const wx = await wxRes.json();
        const c = wx.current;

        els.city.innerText = name;
        els.temp.innerText = Math.round(c.temperature_2m);
        els.desc.innerText = `Код погоды: ${c.weather_code}`;
        els.wind.innerText = `${c.wind_speed_10m} км/ч`;
        els.humidity.innerText = `${c.relative_humidity_2m}%`;
        els.pressure.innerText = `${Math.round(c.surface_pressure)} гПа`;

        changeTheme(c.weather_code);
        updateStats(name);
        addLog(`✅ ${name}: ${Math.round(c.temperature_2m)}°C`);
    } catch (err) {
        addLog(`❌ ${err.message}`);
        alert(err.message);
    } finally {
        tg.MainButton.hide();
    }
}

// Автозагрузка города из параметров
const params = new URLSearchParams(window.location.search);
const cityParam = params.get('city');
if (cityParam) fetchWeather(cityParam);
else if (tg?.initDataUnsafe?.user) {
    els.city.innerText = `Привет, ${tg.initDataUnsafe.user.first_name}!`;
    els.desc.innerText = "Введи город для проверки погоды";
    addLog(`Пользователь открыл приложение`);
}

// Дебаунс поиска
let debounceTimer;
function debouncedSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const city = els.input.value.trim();
        if (city) fetchWeather(city);
    }, 300);
}

els.btn.addEventListener('click', debouncedSearch);
els.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') debouncedSearch(); });