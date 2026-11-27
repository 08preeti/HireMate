"use client";

import React from "react";
import type { WeatherData } from "@/types/assistant";

interface EnvironmentCardProps {
  weather: WeatherData | null;
  onRefresh?: () => void;
  compact?: boolean;
}

export function EnvironmentCard({ weather, onRefresh, compact = false }: EnvironmentCardProps) {
  if (!weather) return null;

  const aqiBadgeColor =
    weather.aqi <= 50
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : weather.aqi <= 100
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-rose-500/15 text-rose-400 border-rose-500/30";

  if (compact) {
    return (
      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-700/50 text-xs backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-bold">{weather.temperature}°C</span>
          <span className="text-slate-300">{weather.weatherDesc}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">{weather.city}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 rounded text-[10px] border font-medium ${aqiBadgeColor}`}>
            AQI {weather.aqi}
          </span>
          {weather.isRaining && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 animate-pulse">
              🌧 Rain
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-cyan-500/20 shadow-lg text-slate-100 backdrop-blur-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌤</span>
          <div>
            <div className="font-semibold text-sm tracking-wide text-cyan-300">
              {weather.city} Environmental Intel
            </div>
            <div className="text-[11px] text-slate-400">
              Updated {new Date(weather.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/40"
          >
            ↻ Refresh
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 my-2 text-center">
        <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <div className="text-[10px] text-slate-400 uppercase">Temp</div>
          <div className="text-base font-bold text-cyan-400">{weather.temperature}°C</div>
          <div className="text-[10px] text-slate-400">Feels {weather.feelsLike}°C</div>
        </div>
        <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <div className="text-[10px] text-slate-400 uppercase">Rain Risk</div>
          <div className={`text-base font-bold ${weather.precipitationProbability > 40 ? "text-amber-400" : "text-emerald-400"}`}>
            {weather.precipitationProbability}%
          </div>
          <div className="text-[10px] text-slate-400">{weather.isRaining ? "Raining" : "Dry"}</div>
        </div>
        <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <div className="text-[10px] text-slate-400 uppercase">Air Quality</div>
          <div className="text-base font-bold text-slate-200">{weather.aqi}</div>
          <div className="text-[10px] font-medium text-slate-300">{weather.aqiLabel}</div>
        </div>
      </div>

      {/* Safety Advice Box */}
      <div className={`mt-2 p-2 rounded-lg text-xs border ${
        weather.isOutdoorSafe
          ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
          : "bg-amber-950/40 border-amber-500/40 text-amber-200"
      }`}>
        <div className="font-semibold flex items-center gap-1.5 mb-0.5">
          <span>{weather.isOutdoorSafe ? "✓" : "⚠️"}</span>
          <span>{weather.isOutdoorSafe ? "Safe for Trade Work" : "Weather Advisory"}</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-300">
          {weather.safetyAdvice}
        </p>
      </div>
    </div>
  );
}
