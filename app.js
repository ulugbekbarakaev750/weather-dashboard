const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
    const theme = tg.colorScheme;
    document.body.classList.add(theme === 'dark' ? 'tg-theme-dark' : 'tg-theme-light');
}

const els = {
    city: document.getElementById('city-name'),
    temp: document.getElementById('current-temp'),
    desc: document.getElementById('weather-description'),
    icon: document.getElementById('weather-icon'),
    wind: document.getElementById('wind-speed'),
    humidity: document.getElementById('humidity'),
    pressure: document.getElementById('pressure'),
    input: document.getElementById('search-input'),
    btn: document.getElementById('search-btn'),
    geoBtn: document.getElementById('geo-btn'),
    loading: document.getElementById('loading-state'),
    content: document.getElementById('weather-content'),
    welcome: document.getElementById('welcome-state'),
    forecast: document.getElementById('forecast-container'),
    greeting: document.getElementById('greeting'),
    sunrise: document.getElementById('sunrise'),
    sunset: document.getElementById('sunset'),
    uvIndex: document.getElementById('uv-index'),
    uvDesc: document.getElementById('uv-desc'),
    alerts: document.getElementById('alerts-container')
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

function getDayName(dateStr) {
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return days[new Date(dateStr).getDay()];
}

function getUVDescription(uv) {
    if (uv <= 2) return { text: 'Низкий', color: 'text-green-500' };
    if (uv <= 5) return { text: 'Умеренный', color: 'text-yellow-500' };
    if (uv <= 7) return { text: 'Высокий', color: 'text-orange-500' };
    if (uv <= 10) return { text: 'Очень высокий', color: 'text-red-500' };
    return { text: 'Экстремальный', color: 'text-purple-600' };
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

    if (windSpeed > 50) createAlert('Сильный ветер', `Порывы до ${Math.round(windSpeed)} км/ч. Будьте осторожны.`, 'text-orange-400 border-orange-400/30', 'bg-orange-400/10');
    if (uvIndex >= 8) createAlert('Опасное УФ-излучение', `Индекс ${uvIndex}. Используйте солнцезащитный крем и головной убор.`, 'text-red-400 border-red-400/30', 'bg-red-400/10');
    if ([95, 96, 99].includes(weatherCode)) createAlert('Гроза', 'Ожидаются грозы и возможные градовые осадки.', 'text-yellow-400 border-yellow-400/30', 'bg-yellow-400/10');

    els.alerts.classList.toggle('hidden', !hasAlerts);
}

function showState(state) {
    els.loading.classList.add('hidden');
    els.content.classList.add('hidden');
    els.welcome.classList.add('hidden');
    if (state === 'loading') els.loading.classList.remove('hidden');
    else if (state === 'content') els.content.classList.remove('hidden');
    else if (state === 'welcome') els.welcome.classList.remove('hidden');
}

function buildChart(hourlyData) {
    const ctx = document.getElementById('weatherChart').getContext('2d');
    const now = new Date().getHours();
    
    // Берем следующие 24 часа
    const sliceStart = now;
    const sliceEnd = now + 24;
    const labels = hourlyData.time.slice(sliceStart, sliceEnd).map(t => t.split('T')[1].substring(0, 5));
    const temps = hourlyData.temperature_2m.slice(sliceStart, sliceEnd);

    const textColor = document.body.classList.contains('tg-theme-dark') ? '#ffffff' : '#000000';

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: temps,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { right: 10 } }, // ИСПРАВЛЕНИЕ: отступ справа, чтобы график не обрезался
            plugins: { legend: { display: false }, tooltip: { enabled: true } },
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
        const icon = getWeatherIcon(code);

        const card = document.createElement('div');
        card.className = 'flex flex-col items-center min-w-[65px] p-2 rounded-xl bg-black/5 dark:bg-white/5';
        card.innerHTML = `
            <span class="text-xs font-semibold mb-1">${getDayName(date)}</span>
            <i class="wi ${icon} text-2xl text-blue-400 mb-1"></i>
            <span class="text-xs font-bold">${max}°</span>
            <span class="text-xs text-secondary">${min}°</span>
        `;
        els.forecast.appendChild(card);
    }
}

async function fetchWeather(lat, lon, cityName = null) {
    showState('loading');
    if (tg) { tg.MainButton.setText("⏳ Загрузка..."); tg.MainButton.show(); }

    try {
        let finalLat = lat, finalLon = lon, finalCity = cityName;

        if (cityName && !lat) {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=ru`);
            const geoData = await geoRes.json();
            if (!geoData.results?.length) throw new Error('Город не найден');
            finalLat = geoData.results[0].latitude;
            finalLon = geoData.results[0].longitude;
            finalCity = geoData.results[0].name;
        }

        // Запрос погоды + УФ индекс + Восход/Закат
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${finalLat}&longitude=${finalLon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code,is_day&hourly=temperature_2m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();
        const c = data.current;
        const d = data.daily;

        // Обновляем UI
        els.city.innerText = finalCity || 'Локация';
        els.temp.innerText = Math.round(c.temperature_2m);
        els.desc.innerText = `Код: ${c.weather_code}`;
        els.wind.innerText = `${Math.round(c.wind_speed_10m)} км/ч`;
        els.humidity.innerText = `${c.relative_humidity_2m}%`;
        els.pressure.innerText = `${Math.round(c.surface_pressure)} гПа`;
        
        els.icon.className = `wi ${getWeatherIcon(c.weather_code, c.is_day)} text-7xl text-blue-400 wi-animate`;

        // Солнце
        els.sunrise.innerText = d.sunrise[0].split('T')[1];
        els.sunset.innerText = d.sunset[0].split('T')[1];

        // УФ-индекс
        const currentUV = Math.round(data.hourly.uv_index[new Date().getHours()] || 0);
        els.uvIndex.innerText = currentUV;
        const uvInfo = getUVDescription(currentUV);
        els.uvDesc.innerText = uvInfo.text;
        els.uvIndex.className = `text-2xl font-extrabold ${uvInfo.color}`;

        // Алерты
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

// Обработчики
els.btn.addEventListener('click', () => {
    const city = els.input.value.trim();
    if (city) fetchWeather(null, null, city);
});

els.input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = els.input.value.trim();
        if (city) fetchWeather(null, null, city);
    }
});

els.geoBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
            () => alert('Не удалось получить доступ к геолокации')
        );
    } else {
        alert('Геолокация не поддерживается')
    }
});

// Автозапуск
const params = new URLSearchParams(window.location.search);
const cityParam = params.get('city');

if (cityParam) {
    fetchWeather(null, null, cityParam);
} else if (tg?.initDataUnsafe?.user) {
    els.greeting.innerText = `Привет, ${tg.initDataUnsafe.user.first_name}!`;
    showState('welcome');
} else {
    showState('welcome');
}
