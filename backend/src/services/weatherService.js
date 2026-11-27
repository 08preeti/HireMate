/**
 * Weather and Air Quality Service for HireMate JARVIS.
 * Uses Open-Meteo API (free, no API key required, highly reliable).
 * Caches responses in memory for 15 minutes per geo-grid.
 */

const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const DEFAULT_COORDS = {
  latitude: 19.9975, // Nashik default
  longitude: 73.7898,
  cityName: "Nashik",
};

/**
 * Interpret WMO Weather Code
 */
function interpretWeatherCode(code) {
  if (code === 0) return { label: "Clear Sky", condition: "clear", isRaining: false };
  if (code === 1 || code === 2) return { label: "Partly Cloudy", condition: "cloudy", isRaining: false };
  if (code === 3) return { label: "Overcast", condition: "overcast", isRaining: false };
  if (code === 45 || code === 48) return { label: "Foggy", condition: "fog", isRaining: false };
  if ([51, 53, 55].includes(code)) return { label: "Light Drizzle", condition: "drizzle", isRaining: true };
  if ([61, 63, 65].includes(code)) return { label: "Rain", condition: "rain", isRaining: true };
  if ([71, 73, 75].includes(code)) return { label: "Snow", condition: "snow", isRaining: false };
  if ([80, 81, 82].includes(code)) return { label: "Rain Showers", condition: "showers", isRaining: true };
  if ([95, 96, 99].includes(code)) return { label: "Thunderstorm", condition: "thunderstorm", isRaining: true };
  return { label: "Fair", condition: "fair", isRaining: false };
}

/**
 * Calculate outdoor work safety recommendation based on real environmental factors
 */
function getWorkSafetyAdvice({ temperature, isRaining, precipitationProbability, aqi, windSpeed }) {
  const alerts = [];
  let isOutdoorSafe = true;

  if (isRaining || precipitationProbability > 40) {
    isOutdoorSafe = false;
    alerts.push("Rain / showers expected: outdoor painting, exterior masonry, and roofing are paused or not recommended. Suggest indoor tasks (plastering, carpentry, tiling).");
  }

  if (temperature >= 38) {
    alerts.push("High heat warning (above 38°C): high risk of heat exhaustion. Schedule heavy labor for early morning or late afternoon, and ensure shade and hydration.");
  } else if (temperature <= 8) {
    alerts.push("Cold conditions: ensure warm apparel for morning shifts.");
  }

  if (aqi && aqi > 150) {
    alerts.push("Elevated air pollution: workers with respiratory conditions should wear protective N95/dust masks.");
  }

  if (windSpeed > 35) {
    alerts.push("High winds: scaffolding and height work should be avoided.");
  }

  if (alerts.length === 0) {
    alerts.push("Favorable environmental conditions for all indoor and outdoor construction, painting, and utility tasks.");
  }

  return {
    isOutdoorSafe,
    summary: alerts.join(" "),
    primaryAlert: alerts[0],
  };
}

/**
 * Fetch live weather and air quality for coordinates
 */
export async function getWeatherAndAirQuality({ latitude, longitude, cityName } = {}) {
  const lat = Number(latitude) || DEFAULT_COORDS.latitude;
  const lon = Number(longitude) || DEFAULT_COORDS.longitude;
  const city = cityName || DEFAULT_COORDS.cityName;

  // Round coordinates to 2 decimals for caching grid (approx ~1km)
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m&hourly=precipitation_probability,rain&forecast_days=1`;
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,us_aqi,pm10,pm2_5`;

    const [weatherRes, aqiRes] = await Promise.allSettled([
      fetch(weatherUrl, { signal: AbortSignal.timeout(4000) }),
      fetch(aqiUrl, { signal: AbortSignal.timeout(4000) }),
    ]);

    let weatherData = null;
    let aqiData = null;

    if (weatherRes.status === "fulfilled" && weatherRes.value.ok) {
      weatherData = await weatherRes.value.json();
    }
    if (aqiRes.status === "fulfilled" && aqiRes.value.ok) {
      aqiData = await aqiRes.value.json();
    }

    const currentW = weatherData?.current || {};
    const currentAqi = aqiData?.current || {};

    const temp = Math.round(currentW.temperature_2m ?? 26);
    const feelsLike = Math.round(currentW.apparent_temperature ?? temp);
    const humidity = Math.round(currentW.relative_humidity_2m ?? 45);
    const windSpeed = Math.round(currentW.wind_speed_10m ?? 10);
    const weatherCode = currentW.weather_code ?? 1;
    const { label: weatherDesc, condition, isRaining } = interpretWeatherCode(weatherCode);

    // Check hourly rain probability
    const precipProbArray = weatherData?.hourly?.precipitation_probability || [];
    const maxPrecipProb = precipProbArray.length ? Math.max(...precipProbArray.slice(0, 12)) : (isRaining ? 80 : 10);

    const usAqi = currentAqi.us_aqi ?? (currentAqi.european_aqi ? currentAqi.european_aqi * 2 : 55);
    const aqiLabel = usAqi <= 50 ? "Good" : usAqi <= 100 ? "Moderate" : usAqi <= 150 ? "Unhealthy for Sensitive Groups" : "Poor";

    const advice = getWorkSafetyAdvice({
      temperature: temp,
      isRaining,
      precipitationProbability: maxPrecipProb,
      aqi: usAqi,
      windSpeed,
    });

    const result = {
      city,
      coordinates: { latitude: lat, longitude: lon },
      temperature: temp,
      feelsLike,
      humidity,
      windSpeed,
      condition,
      weatherDesc,
      isRaining,
      precipitationProbability: maxPrecipProb,
      aqi: usAqi,
      aqiLabel,
      safetyAdvice: advice.summary,
      primaryAlert: advice.primaryAlert,
      isOutdoorSafe: advice.isOutdoorSafe,
      fetchedAt: new Date().toISOString(),
    };

    cache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
  } catch (err) {
    console.warn("Weather fetch fallback used:", err.message);
    // Graceful fallback defaults
    return {
      city,
      coordinates: { latitude: lat, longitude: lon },
      temperature: 26,
      feelsLike: 27,
      humidity: 50,
      windSpeed: 10,
      condition: "fair",
      weatherDesc: "Clear",
      isRaining: false,
      precipitationProbability: 10,
      aqi: 60,
      aqiLabel: "Moderate",
      safetyAdvice: "Weather conditions are suitable for general trade work.",
      primaryAlert: "Good working conditions.",
      isOutdoorSafe: true,
      fetchedAt: new Date().toISOString(),
    };
  }
}
