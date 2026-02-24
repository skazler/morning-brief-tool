import axios from "axios";
import { config } from "../config";
import { WeatherData } from "../types";

export async function fetchWeather(): Promise<WeatherData | null> {
  const { apiKey, location, units } = config.weather;

  if (!apiKey) {
    console.warn("[weather] No API key set — skipping weather.");
    return null;
  }

  try {
    // Support both "City Name" and "lat,lon" formats
    const isLatLon = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(location.trim());
    const queryParam = isLatLon
      ? (() => {
          const [lat, lon] = location.split(",");
          return `lat=${lat.trim()}&lon=${lon.trim()}`;
        })()
      : `q=${encodeURIComponent(location)}`;

    const url = `https://api.openweathermap.org/data/2.5/weather?${queryParam}&units=${units}&appid=${apiKey}`;
    const { data } = await axios.get(url);

    return {
      city: data.name,
      country: data.sys.country,
      description: capitalise(data.weather[0].description),
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed),
      units,
    };
  } catch (err: any) {
    console.error(
      "[weather] Failed to fetch:",
      err.response?.data ?? err.message
    );
    return null;
  }
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
