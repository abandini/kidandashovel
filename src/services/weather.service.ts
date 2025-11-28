// Weather service for A Kid and a Shovel

import type { Env, WeatherForecast, ForecastPeriod } from '../types';
import { generateId, now } from '../utils/helpers';
import { sendPushNotification } from '../routes/api/push';

const NWS_OFFICE = 'CLE'; // Cleveland
const NWS_GRID_X = 82;
const NWS_GRID_Y = 64;
const NWS_API_BASE = 'https://api.weather.gov';

interface NWSResponse {
  properties: {
    periods: Array<{
      number: number;
      name: string;
      startTime: string;
      endTime: string;
      temperature: number;
      temperatureUnit: string;
      windSpeed: string;
      windDirection: string;
      shortForecast: string;
      detailedForecast: string;
      probabilityOfPrecipitation?: { value: number };
    }>;
    updateTime: string;
  };
}

export async function fetchWeatherForecast(): Promise<WeatherForecast | null> {
  try {
    const response = await fetch(
      `${NWS_API_BASE}/gridpoints/${NWS_OFFICE}/${NWS_GRID_X},${NWS_GRID_Y}/forecast`,
      {
        headers: {
          'User-Agent': 'AKidAndAShovel/1.0 (contact@akidandashovel.com)',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('NWS API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json() as NWSResponse;

    const periods: ForecastPeriod[] = data.properties.periods.map(p => ({
      name: p.name,
      start_time: p.startTime,
      end_time: p.endTime,
      temperature: p.temperature,
      temperature_unit: p.temperatureUnit,
      wind_speed: p.windSpeed,
      wind_direction: p.windDirection,
      short_forecast: p.shortForecast,
      detailed_forecast: p.detailedForecast,
      precipitation_probability: p.probabilityOfPrecipitation?.value,
    }));

    return {
      periods,
      updated_at: data.properties.updateTime,
    };
  } catch (error) {
    console.error('Fetch weather forecast error:', error);
    return null;
  }
}

export function parseSnowfall(detailedForecast: string): { min: number; max: number } | null {
  // Look for patterns like "2 to 4 inches", "3-5 inches", "around 2 inches"
  const patterns = [
    /(\d+)\s*to\s*(\d+)\s*inch/i,
    /(\d+)\s*-\s*(\d+)\s*inch/i,
    /around\s*(\d+)\s*inch/i,
    /up\s*to\s*(\d+)\s*inch/i,
    /(\d+)\+?\s*inch/i,
  ];

  for (const pattern of patterns) {
    const match = detailedForecast.match(pattern);
    if (match) {
      if (match[2]) {
        return { min: parseInt(match[1]), max: parseInt(match[2]) };
      } else {
        const amount = parseInt(match[1]);
        return { min: amount, max: amount };
      }
    }
  }

  return null;
}

export function getAlertType(snowInches: number): 'light' | 'moderate' | 'heavy' {
  if (snowInches >= 6) return 'heavy';
  if (snowInches >= 4) return 'moderate';
  return 'light';
}

export function getAlertMessage(alertType: 'light' | 'moderate' | 'heavy', inches: { min: number; max: number }): string {
  const inchText = inches.min === inches.max
    ? `${inches.min} inches`
    : `${inches.min}-${inches.max} inches`;

  switch (alertType) {
    case 'light':
      return `Light snow expected (${inchText}) — Good opportunity for quick jobs!`;
    case 'moderate':
      return `Moderate snow coming (${inchText}) — Consider posting a job now`;
    case 'heavy':
      return `Heavy snow forecast (${inchText}) — Book a worker before they fill up!`;
  }
}

export async function checkWeatherAndNotify(env: Env): Promise<void> {
  console.log('Checking weather forecast...');

  const forecast = await fetchWeatherForecast();
  if (!forecast) {
    console.error('Failed to fetch weather forecast');
    return;
  }

  // Check each period for snow
  for (const period of forecast.periods) {
    const shortForecast = period.short_forecast.toLowerCase();
    const detailedForecast = period.detailed_forecast.toLowerCase();

    // Check if snow is mentioned
    if (!shortForecast.includes('snow') && !detailedForecast.includes('snow')) {
      continue;
    }

    // Parse snowfall amount
    const snowfall = parseSnowfall(period.detailed_forecast);
    if (!snowfall || snowfall.max < 2) {
      continue; // Ignore less than 2 inches
    }

    const alertType = getAlertType(snowfall.max);
    const alertMessage = getAlertMessage(alertType, snowfall);

    // Check if we've already sent an alert for this forecast
    const existingAlert = await env.DB.prepare(`
      SELECT id FROM weather_alerts
      WHERE forecast_date = ? AND forecast_period = ?
      AND created_at > datetime('now', '-12 hours')
    `).bind(period.start_time.split('T')[0], period.name).first();

    if (existingAlert) {
      console.log(`Already sent alert for ${period.name}`);
      continue;
    }

    // Log the alert
    const alertId = generateId();
    await env.DB.prepare(`
      INSERT INTO weather_alerts (
        id, forecast_date, forecast_period, snow_inches_min, snow_inches_max,
        alert_type, alert_message, raw_forecast, notifications_sent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).bind(
      alertId,
      period.start_time.split('T')[0],
      period.name,
      snowfall.min,
      snowfall.max,
      alertType,
      alertMessage,
      period.detailed_forecast,
      now()
    ).run();

    // Send notifications to relevant users
    let notificationsSent = 0;

    // Notify homeowners
    const homeowners = await env.DB.prepare(`
      SELECT u.id FROM users u
      JOIN homeowner_profiles hp ON u.id = hp.user_id
      WHERE u.type = 'homeowner'
    `).all();

    for (const homeowner of homeowners.results || []) {
      // Check rate limit using Durable Object
      const rateLimiter = env.RATE_LIMITER.get(
        env.RATE_LIMITER.idFromName(`${homeowner.id}:weather`)
      );

      const canNotify = await rateLimiter.fetch('http://internal/can-notify').then(r => r.json());

      if (canNotify) {
        await sendPushNotification(env, homeowner.id as string, {
          title: 'Snow Alert',
          body: alertMessage,
          icon: '/icons/icon-192.png',
          url: '/jobs/new',
          data: { type: 'weather_alert', alert_id: alertId },
        });
        notificationsSent++;
      }
    }

    // Notify available workers
    const workers = await env.DB.prepare(`
      SELECT u.id FROM users u
      JOIN teen_profiles tp ON u.id = tp.user_id
      WHERE u.type = 'teen' AND tp.verified = 1
    `).all();

    for (const worker of workers.results || []) {
      const rateLimiter = env.RATE_LIMITER.get(
        env.RATE_LIMITER.idFromName(`${worker.id}:weather`)
      );

      const canNotify = await rateLimiter.fetch('http://internal/can-notify').then(r => r.json());

      if (canNotify) {
        await sendPushNotification(env, worker.id as string, {
          title: 'Snow Coming!',
          body: `${snowfall.min}-${snowfall.max} inches expected ${period.name}. Mark yourself available?`,
          icon: '/icons/icon-192.png',
          url: '/worker/dashboard',
          data: { type: 'weather_alert', alert_id: alertId },
        });
        notificationsSent++;
      }
    }

    // Update notification count
    await env.DB.prepare(
      'UPDATE weather_alerts SET notifications_sent = ? WHERE id = ?'
    ).bind(notificationsSent, alertId).run();

    console.log(`Weather alert sent: ${alertType} - ${notificationsSent} notifications`);
  }
}

// Get cached forecast or fetch new one
export async function getCachedForecast(env: Env): Promise<WeatherForecast | null> {
  const cacheKey = 'weather:forecast';
  const cached = await env.CACHE.get(cacheKey, 'json');

  if (cached) {
    return cached as WeatherForecast;
  }

  const forecast = await fetchWeatherForecast();
  if (forecast) {
    // Cache for 1 hour
    await env.CACHE.put(cacheKey, JSON.stringify(forecast), { expirationTtl: 3600 });
  }

  return forecast;
}
