const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
    const theme = tg.colorScheme;
    document.body.classList.add(theme === 'dark' ? 'tg-theme-dark' : 'tg-theme-light');
}

// 🔥 СЛОВАРЬ ПЕРЕВОДОВ ДЛЯ ДАШБОРДА
const UI_TRANSLATIONS = {
    ru: {
        search_placeholder: "Введите город...",
        geo: "Моя геопозиция",
        loading: "Загрузка данных...",
        sun: "☀️ Солнце",
        uv_title: "🕶️ УФ-индекс",
        chart: "📈 Температура (24ч)",
        forecast: "📅 Прогноз на 5 дней",
        greeting: "Привет",
        welcome_desc: "Введи город или нажми на геолокацию.",
        days: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
        uv_low: "Низкий", uv_mod: "Умеренный", uv_high: "Высокий", uv_vhigh: "Очень высокий", uv_ext: "Экстремальный",
        alert_wind_title: "Сильный ветер", alert_wind_desc: "Будьте осторожны.",
        alert_uv_title: "Опасное УФ-излучение", alert_uv_desc: "Используйте крем.",
        alert_storm_title: "Гроза", alert_storm_desc: "Ожидаются грозы."
    },
    uz: {
        search_placeholder: "Shahar nomini kiriting...",
        geo: "Mening geolokatsiyam",
        loading: "Ma'lumotlar yuklanmoqda...",
        sun: "☀️ Quyosh",
        uv_title: "🕶️ UF-indeks",
        chart: "📈 Harorat (24 soat)",
        forecast: "📅 5 kunlik ob-havo",
        greeting: "Salom",
        welcome_desc: "Shaharni kiriting yoki geolokatsiyani bosing.",
        days: ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'],
        uv_low: "Past", uv_mod: "O'rtacha", uv_high: "Yuqori", uv_vhigh: "Juda yuqori", uv_ext: "Ekstremal",
        alert_wind_title: "Kuchli shamol", alert_wind_desc: "Ehtiyot bo'ling.",
        alert_uv_title: "Xavfli UF-nurlanish", alert_uv_desc: "Kremlardan foydalaning.",
        alert_storm_title: "Momoguliq", alert_storm_desc: "Momoguliq kutilmoqda."
    },
    en: {
        search_placeholder: "Enter city...",
        geo: "My location",
        loading: "Loading data...",
        sun: "☀️ Sun",
        uv_title: "🕶️ UV Index",
        chart: "📈 Temperature (24h)",
        forecast: "📅 5-day forecast",
        greeting: "Hello",
        welcome_desc: "Enter a city or tap location.",
        days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        uv_low: "Low", uv_mod: "Moderate", uv_high: "High", uv_vhigh: "Very High", uv_ext: "Extreme",
        alert_wind_title: "Strong wind", alert_wind_desc: "Be careful.",
        alert_uv_title: "Dangerous UV", alert_uv_desc: "Use sunscreen.",
        alert_storm_title: "Thunderstorm", alert_storm_desc: "Storms expected."
    }
};

// Определяем язык из ссылки (?lang=uz) или берем русский по умолчанию
const params = new URLSearchParams(window.location.search);
const currentLang = params.get('lang') || 'ru';
const T = UI_TRANSLATIONS[currentLang] || UI_TRANSLATIONS['ru'];

// Применяем переводы к HTML элементам
document.getElementById('search-input').placeholder = T.search_placeholder;
document.getElementById('txt-geo').innerText = T.geo;
document.getElementById('txt-loading').innerText = T.loading;
document.getElementById('txt-sun').innerText = T.sun;
document.getElementById('txt-uv-title').innerText = T.uv_title;
document.getElementById('txt-chart').innerText = T.chart;
document.getElementById('txt-forecast').innerText = T.forecast;
document.getElementById('txt-welcome-desc').innerText = T.welcome_desc;

const els = {
    city: document.getElementById('city-name'), temp: document.getElementById('current-temp'),
    desc: document.getElementById('weather-description'), icon: document.getElementById('weather-icon'),
    wind: document.getElementById('wind-speed'), humidity: document.getElementById('humidity'),
    pressure: document.getElementById('pressure'), input: document.getElementById('search-input'),
    btn: document.getElementById('search-btn'), geoBtn: document.getElementById('geo-btn'),
    loading: document.getElementById('loading-state'), content: document.getElementById('weather-content'),
    welcome: document.getElementById('welcome-state'), forecast: document.getElementById('forecast-container'),
    greeting: document.getElementById('greeting'), sunrise: document.getElementById('sunrise'),
    sunset: document.getElementById('sunset'), uvIndex: document.getElementById('uv-index'),
    uvDesc: document.getElementById('uv-desc'), alerts: document.getElementById('alerts-container')
};

let chart = null;

function getWeatherIcon(code, isDay = true) {
    if (code === 0) return isDay ? 'wi-day-sunny' : 'wi-night-clear';
    if ([1, 2, 3].includes(code)) return isDay ? 'wi-day-cloudy' : 'wi-night-cloudy';
    if ([45, 48].includes(code)) return 'wi-fog';
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'wi-rain';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'wi-snow';
    if ([95, 96, 99].includes(code)) return 'wi-thunderstorm';
    return 'wi-cloud';
}

function getUVDescription(uv) {
    if (uv <= 2) return { text: T.uv_low, color: 'text-green-500' };
    if (uv <= 5) return { text: T.uv_mod, color: 'text-yellow-500' };
    if (uv <= 7) return { text: T.uv_high, color: 'text-orange-500' };
    if (uv <= 10) return { text: T.uv_vhigh, color: 'text-red-500' };
    return { text: T.uv_ext, color: 'text-purple-600' };
}

function checkAlerts(windSpeed, uvIndex, weatherCode) {
    els.alerts.innerHTML = '';
    let hasAlerts = false;
    const createAlert = (title, desc, colorClass, bgClass) => {
        hasAlerts = true;
        const div = document.createElement('div');
        div.className = `p-3 rounded-xl border ${colorClass} ${bgClass} flex items-start gap-3`;
        div.innerHTML = `<span class="text-xl">⚠️</span><div><h4 class="font-bold text-sm">${title}</h4><p class="text-xs opacity-80">${desc}</p></div>`;
        els.alerts.appendChild(div);
    };
    if (windSpeed > 50) createAlert(T.alert_wind_title, T.alert_wind_desc, 'text-orange-400 border-orange-400/30', 'bg-orange-400/10');
    if (uvIndex >= 8) createAlert(T.alert_uv_title, T.alert_uv_desc, 'text-red-400 border-red-400/30', 'bg-red-400/10');
    if ([95, 96, 99].includes(weatherCode)) createAlert(T.alert_storm_title, T.alert_storm_desc, 'text-yellow-400 border-yellow-400/30', 'bg-yellow-400/10');
    els.alerts.classList.toggle('hidden', !hasAlerts);
}

function showState(state) {
    els.loading.classList.add('hidden'); els.content.classList.add('hidden'); els.welcome.classList.add('hidden');
    if (state === 'loading') els.loading.classList.remove('hidden');
    else if (state === 'content') els.content.classList.remove('hidden');
    else if (state === 'welcome') els.welcome.classList.remove('hidden');
}

function buildChart(hourlyData) {
    const ctx = document.getElementById('weatherChart').getContext('2d');
    const now = new Date().getHours();
    const labels = hourlyData.time.slice(now, now + 24).map(t => t.split('T')[1].substring(0, 5));
    const temps = hourlyData.temperature_2m.slice(now, now + 24);
    const textColor = document.body.classList.contains('tg-theme-dark') ? '#ffffff' : '#000000';
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ data: temps, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 0 }] },
        options: {
            responsive: true, maintainAspectRatio: false, layout: { padding: { right: 10 } },
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } },
                x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 }, maxTicksLimit: 6 } }
            }
        }
    });
}

function renderForecast(dailyData) {
    els.forecast.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const date = dailyData.time[i];
        const min = Math.round(dailyData.temperature_2m_min[i]);
        const max = Math.round(dailyData.temperature_2m_max[i]);
        const code = dailyData.weather_code[i];
        const card = document.createElement('div');
        card.className = 'flex flex-col items-center min-w-[65px] p-2 rounded-xl bg-black/5 dark:bg-white/5';
        card.innerHTML = `<span class="text-xs font-semibold mb-1">${T.days[new Date(date).getDay()]}</span><i class="wi ${getWeatherIcon(code)} text-2xl text-blue-400 mb-1"></i><span class="text-xs font-bold">${max}°</span><span class="text-xs text-secondary">${min}°</span>`;
        els.forecast.appendChild(card);
    }
}

async function fetchWeather(lat, lon, cityName = null) {
    showState('loading');
    if (tg) { tg.MainButton.setText("⏳"); tg.MainButton.show(); }
    try {
        let finalLat = lat, finalLon = lon, finalCity = cityName;
        if (cityName && !lat) {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=${currentLang}`);
            const geoData = await geoRes.json();
            if (!geoData.results?.length) throw new Error('City not found');
            finalLat = geoData.results[0].latitude; finalLon = geoData.results[0].longitude; finalCity = geoData.results[0].name;
        }
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${finalLat}&longitude=${finalLon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code,is_day&hourly=temperature_2m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();
        const c = data.current; const d = data.daily;

        els.city.innerText = finalCity || 'Location';
        els.temp.innerText = Math.round(c.temperature_2m);
        els.desc.innerText = `Code: ${c.weather_code}`;
        els.wind.innerText = `${Math.round(c.wind_speed_10m)} km/h`;
        els.humidity.innerText = `${c.relative_humidity_2m}%`;
        els.pressure.innerText = `${Math.round(c.surface_pressure)} hPa`;
        els.icon.className = `wi ${getWeatherIcon(c.weather_code, c.is_day)} text-7xl text-blue-400 wi-animate`;
        els.sunrise.innerText = d.sunrise[0].split('T')[1];
        els.sunset.innerText = d.sunset[0].split('T')[1];
        const currentUV = Math.round(data.hourly.uv_index[new Date().getHours()] || 0);
        els.uvIndex.innerText = currentUV;
        const uvInfo = getUVDescription(currentUV);
        els.uvDesc.innerText = uvInfo.text;
        els.uvIndex.className = `text-2xl font-extrabold ${uvInfo.color}`;
        checkAlerts(c.wind_speed_10m, currentUV, c.weather_code);
        buildChart(data.hourly);
        renderForecast(d);
        showState('content');
    } catch (err) {
        alert(err.message);
        showState('welcome');
    } finally {
        if (tg) tg.MainButton.hide();
    }
}

els.btn.addEventListener('click', () => { if (els.input.value.trim()) fetchWeather(null, null, els.input.value.trim()); });
els.input.addEventListener('keypress', (e) => { if (e.key === 'Enter' && els.input.value.trim()) fetchWeather(null, null, els.input.value.trim()); });
els.geoBtn.addEventListener('click', () => {
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(pos => fetchWeather(pos.coords.latitude, pos.coords.longitude), () => alert('GPS error'));
});

const cityParam = params.get('city');
if (cityParam) {
    fetchWeather(null, null, cityParam);
} else if (tg?.initDataUnsafe?.user) {
    els.greeting.innerText = `${T.greeting}, ${tg.initDataUnsafe.user.first_name}!`;
    showState('welcome');
} else {
    showState('welcome');
}
