const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
    
    // Применяем тему Telegram
    const theme = tg.colorScheme; // 'dark' или 'light'
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
    greeting: document.getElementById('greeting')
};

let chart = null;

// Маппинг кодов погоды WMO на иконки Weather Icons
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
    const date = new Date(dateStr);
    return days[date.getDay()];
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
    const labels = hourlyData.time.slice(now, now + 24).map(t => t.split('T')[1].substring(0, 5));
    const temps = hourlyData.temperature_2m.slice(now, now + 24);

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
        card.className = 'flex flex-col items-center min-w-[60px] p-2 rounded-xl bg-black/5 dark:bg-white/5';
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

        // Если передан только город, сначала ищем координаты
        if (cityName && !lat) {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=ru`);
            const geoData = await geoRes.json();
            if (!geoData.results?.length) throw new Error('Город не найден');
            finalLat = geoData.results[0].latitude;
            finalLon = geoData.results[0].longitude;
            finalCity = geoData.results[0].name;
        }

        // Запрос погоды (текущая + почасовая + ежедневная)
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${finalLat}&longitude=${finalLon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code,is_day&hourly=temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();

        // Обновляем UI
        els.city.innerText = finalCity || 'Локация';
        els.temp.innerText = Math.round(data.current.temperature_2m);
        els.desc.innerText = `Код: ${data.current.weather_code}`; // Open-Meteo не дает текст, можно маппить, но оставим так для краткости
        els.wind.innerText = `${Math.round(data.current.wind_speed_10m)} км/ч`;
        els.humidity.innerText = `${data.current.relative_humidity_2m}%`;
        els.pressure.innerText = `${Math.round(data.current.surface_pressure)} гПа`;
        
        els.icon.className = `wi ${getWeatherIcon(data.current.weather_code, data.current.is_day)} text-7xl text-blue-400 wi-animate`;

        buildChart(data.hourly);
        renderForecast(data.daily);
        
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
