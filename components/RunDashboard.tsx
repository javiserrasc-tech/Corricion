
import React from 'react';
import { formatTime, formatPace } from '../utils/geoUtils.ts';

interface RunDashboardProps {
  elapsedTime: number;
  distance: number;
  currentSpeed: number;
  currentPace: number;
}

const StatCard: React.FC<{ label: string, value: string | number, unit?: string, color: string }> = ({ label, value, unit, color }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-[2rem] flex flex-col items-center justify-center">
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</span>
    <div className="flex items-baseline gap-1">
      <span className={`text-3xl font-black ${color} font-mono tracking-tighter`}>{value}</span>
      {unit && <span className="text-[10px] font-bold text-slate-600 uppercase">{unit}</span>}
    </div>
  </div>
);

const RunDashboard: React.FC<RunDashboardProps> = ({ elapsedTime, distance, currentSpeed, currentPace }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
        <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Cronómetro</span>
        <span className="text-6xl md:text-7xl font-black text-white font-mono tracking-tighter">
          {formatTime(elapsedTime)}
        </span>
      </div>
      
      <StatCard label="Distancia" value={distance.toFixed(2)} unit="km" color="text-emerald-400" />
      <StatCard label="Velocidad" value={currentSpeed.toFixed(1)} unit="km/h" color="text-orange-400" />
      <StatCard label="Ritmo" value={formatPace(currentPace)} unit="min/km" color="text-indigo-400" />
      <StatCard label="Progreso" value={Math.min(100, (distance / 5) * 100).toFixed(0)} unit="%" color="text-pink-400" />
    </div>
  );
};

export default RunDashboard;
