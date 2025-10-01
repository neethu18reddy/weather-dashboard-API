 const WX = {
            map(code) {
                
                const groups = [
                    { codes: [0], label: 'Clear sky', group: 'clear' },
                    { codes: [1, 2, 3], label: 'Partly/Cloudy', group: 'cloudy' },
                    { codes: [45, 48], label: 'Fog', group: 'fog' },
                    { codes: [51, 53, 55, 56, 57], label: 'Drizzle', group: 'rain' },
                    { codes: [61, 63, 65, 66, 67, 80, 81, 82], label: 'Rain', group: 'rain' },
                    { codes: [71, 73, 75, 77, 85, 86], label: 'Snow', group: 'snow' },
                    { codes: [95, 96, 99], label: 'Thunderstorm', group: 'thunder' },
                ];
                for (const g of groups) { if (g.codes.includes(code)) return g; }
                return { label: '—', group: 'clear' };
            },
            icon(group) {
              
                const path = {
                    clear: '<circle cx="12" cy="12" r="5" fill="currentColor"/>',
                    cloudy: '<path d="M7 15a4 4 0 0 1 0-8 5 5 0 0 1 9.7 1.6A4 4 0 1 1 17 19H8a3 3 0 0 1-1-5.8Z" fill="currentColor"/>',
                    rain: '<path d="M7 15a4 4 0 0 1 0-8 5 5 0 0 1 9.7 1.6A4 4 0 1 1 17 19H8a3 3 0 0 1-1-5.8Z" fill="currentColor"/><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="9" y1="20" x2="8" y2="23"/><line x1="12" y1="20" x2="11" y2="23"/><line x1="15" y1="20" x2="14" y2="23"/></g>',
                    thunder: '<path d="M7 15a4 4 0 0 1 0-8 5 5 0 0 1 9.7 1.6A4 4 0 1 1 17 19H8a3 3 0 0 1-1-5.8Z" fill="currentColor"/><path d="M12 12l-3 5h2l-1 4 4-6h-2l2-3z" fill="currentColor"/>',
                    snow: '<path d="M7 15a4 4 0 0 1 0-8 5 5 0 0 1 9.7 1.6A4 4 0 1 1 17 19H8a3 3 0 0 1-1-5.8Z" fill="currentColor"/><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="9" y1="21" x2="9" y2="23"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="15" y1="21" x2="15" y2="23"/></g>',
                    fog: '<rect x="4" y="11" width="16" height="2" fill="currentColor"/><rect x="3" y="15" width="18" height="2" fill="currentColor"/>'
                };
                return `<svg class="wx-icon" viewBox="0 0 24 24" aria-hidden="true">${path[group] || path.clear}</svg>`;
            },
            theme(group) {
                return {
                    clear: 'theme-clear', cloudy: 'theme-cloudy', rain: 'theme-rain', thunder: 'theme-thunder', snow: 'theme-snow', fog: 'theme-fog'
                }[group] || 'theme-clear';
            }
        };

        
        async function geocodeCity(q) {
            const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`;
            const r = await fetch(url);
            if (!r.ok) throw new Error('Geocoding failed');
            const j = await r.json();
            if (!j.results || !j.results.length) throw new Error('City not found');
            const c = j.results[0];
            return { name: `${c.name}${c.admin1 ? ', ' + c.admin1 : ''}, ${c.country_code}`, latitude: c.latitude, longitude: c.longitude };
        }

      
        async function fetchForecast(lat, lon) {
            const params = new URLSearchParams({
                latitude: lat,
                longitude: lon,
                timezone: 'auto',
                current: ['temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'weather_code', 'wind_speed_10m', 'uv_index'].join(','),
                hourly: ['uv_index'].join(','),
                daily: ['temperature_2m_max', 'temperature_2m_min', 'uv_index_max', 'wind_speed_10m_max', 'weather_code', 'sunrise', 'sunset'].join(','),
                forecast_days: '7',
                past_days: '2'
            });
            const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
            const r = await fetch(url);
            if (!r.ok) throw new Error('Forecast failed');
            return await r.json();
        }

        // =============================
        // DOM helpers
        // =============================
        const $ = sel => document.querySelector(sel);
        const forecastGrid = $('#forecastGrid');
        const pastGrid = $('#pastGrid');
        const sunGrid = $('#sunGrid');

        function setTheme(group) {
            document.body.className = WX.theme(group);
        }

        function fmtTime(dStr) {
            const d = new Date(dStr);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        function fmtDate(dStr) {
            const d = new Date(dStr);
            return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        }

        function updateQuickStats(current) {
            $('#qs-temp').textContent = `${Math.round(current.temperature_2m)} °C`;
            $('#qs-wind').textContent = `Wind: ${Math.round(current.wind_speed_10m)} km/h`;
            $('#qs-hum').textContent = `Humidity: ${Math.round(current.relative_humidity_2m)}%`;
            $('#qs-uv').textContent = `UV: ${current.uv_index ?? '—'}`;
        }

        function renderCurrent(place, data) {
            const c = data.current;
            $('#place').textContent = place;
            $('#timeLocal').textContent = `• ${new Date().toLocaleString([], { hour: '2-digit', minute: '2-digit' })}`;
            $('#tempNow').textContent = `${Math.round(c.temperature_2m)} °C`;
            const m = WX.map(c.weather_code);
            const iconSvg = WX.icon(m.group);
            $('#currentIcon').outerHTML = iconSvg;
            $('#metaLine').textContent = `Feels like ${Math.round(c.apparent_temperature)} °C • ${m.label}`;
            setTheme(m.group);
            updateQuickStats(c);
        }

        function renderForecast(daily) {
            forecastGrid.innerHTML = '';
            // daily.time is array including past 2 days + 7 forecast = up to 9 items
            // We will take next 5 future days (skip today index0? Depends on API: includes today). We'll pick days starting from index of today.
            const now = new Date();
            const days = [];
            for (let i = 0; i < daily.time.length; i++) {
                const dt = new Date(daily.time[i]);
                // choose future days (>= tomorrow) up to 5
                if (dt >= new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)) {
                    days.push(i);
                    if (days.length === 5) break;
                }
            }
            if (days.length < 5) {
                // fallback: if API day alignment differs, just take last 5 entries
                const start = Math.max(0, daily.time.length - 5);
                for (let i = start; i < daily.time.length; i++) days.push(i);
            }
            days.forEach(i => {
                const code = daily.weather_code[i];
                const m = WX.map(code);
                const html = `
          <div class="tile">
            <div class="day">${fmtDate(daily.time[i])}</div>
            <div>${WX.icon(m.group)}</div>
            <div class="range">${Math.round(daily.temperature_2m_min[i])}° / ${Math.round(daily.temperature_2m_max[i])}°C</div>
            <div class="mini">Wind max: ${Math.round(daily.wind_speed_10m_max[i] || 0)} km/h</div>
            <div class="mini">UV max: ${daily.uv_index_max[i] ?? '—'}</div>
          </div>`;
                forecastGrid.insertAdjacentHTML('beforeend', html);
            });
        }

        function renderPast(daily) {
            pastGrid.innerHTML = '';
            // Take the first two entries that are strictly before today
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const idx = daily.time.map((t, i) => ({ t: new Date(t), i })).filter(o => o.t < today).slice(-2);
            idx.forEach(({ i }) => {
                const code = daily.weather_code[i];
                const m = WX.map(code);
                const html = `
          <div class="tile">
            <div class="day">${fmtDate(daily.time[i])}</div>
            <div>${WX.icon(m.group)}</div>
            <div class="range">${Math.round(daily.temperature_2m_min[i])}° / ${Math.round(daily.temperature_2m_max[i])}°C</div>
            <div class="mini">Wind max: ${Math.round(daily.wind_speed_10m_max[i] || 0)} km/h</div>
          </div>`;
                pastGrid.insertAdjacentHTML('beforeend', html);
            });
            if (!pastGrid.children.length) { pastGrid.innerHTML = '<div class="mini">No past data available</div>'; }
        }

        function renderSun(daily) {
            sunGrid.innerHTML = '';
            daily.time.forEach((t, i) => {
                const html = `
          <div class="sun-item">
            <div class="day">${fmtDate(t)}</div>
            <div class="mini">Sunrise: ${fmtTime(daily.sunrise[i])}</div>
            <div class="mini">Sunset: ${fmtTime(daily.sunset[i])}</div>
          </div>`;
                sunGrid.insertAdjacentHTML('beforeend', html);
            });
        }

        // =============================
        // Location handlers
        // =============================
        async function loadByCoords(lat, lon, placeLabel = 'Your location') {
            try {
                document.title = 'Loading — NeoWeather';
                const data = await fetchForecast(lat, lon);
                renderCurrent(placeLabel, data);
                renderForecast(data.daily);
                renderPast(data.daily);
                renderSun(data.daily);
                document.title = `${placeLabel} — NeoWeather`;
            } catch (e) {
                alert(e.message || 'Failed to load data');
            }
        }

        async function searchCity() {
            const q = document.getElementById('searchInput').value.trim();
            if (!q) return alert('Enter a city');
            try {
                const geo = await geocodeCity(q);
                await loadByCoords(geo.latitude, geo.longitude, geo.name);
            } catch (e) { alert(e.message || 'Search failed'); }
        }

        // Watch-position (live tracker)
        let watchId = null;
        function enableGPS() {
            if (!('geolocation' in navigator)) return alert('Geolocation not supported');
            if (watchId) { navigator.geolocation.clearWatch(watchId); watchId = null; }
            watchId = navigator.geolocation.watchPosition(async (pos) => {
                const { latitude, longitude } = pos.coords;
                await loadByCoords(latitude, longitude, '📍 Live location');
            }, (err) => {
                console.warn(err);
                alert('Location permission denied or unavailable');
            }, { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 });
        }

        // =============================
        // Wire up events
        // =============================
        document.getElementById('searchBtn').addEventListener('click', searchCity);
        document.getElementById('searchInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') searchCity(); });
        document.getElementById('gpsBtn').addEventListener('click', enableGPS);

        // Default: try one-time GPS on load (non-blocking)
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition((pos) => {
                loadByCoords(pos.coords.latitude, pos.coords.longitude, '📍 Your location');
            }, () => {
                // fallback: default to Hyderabad, IN
                geocodeCity('Hyderabad').then(g => loadByCoords(g.latitude, g.longitude, g.name));
            });
        } else {
            geocodeCity('Hyderabad').then(g => loadByCoords(g.latitude, g.longitude, g.name));
        }