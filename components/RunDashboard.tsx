
import React from 'react';
import { RunStatus } from '../types';
import { formatTime, formatPace } from '../utils/geoUtils';

interface RunDashboardProps {
  status: RunStatus;
  elapsedTime: number;
  distance: number;
  currentSpeed: number; // km/h
  currentPace: number; // min/km
}

const RunDashboard: React.FC<RunDashboardProps> = ({ status, elapsedTime, distance, currentSpeed, currentPace }) => {
  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      <div className="bg-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center border border-slate-700 shadow-xl">
        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Time</span>
        <span className="text-4xl md:text-5xl font-mono font-black text-blue-400">
          {formatTime(elapsedTime)}
        </span>
      </div>
      
      <div className="bg-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center border border-slate-700 shadow-xl">
        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Distance</span>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl md:text-5xl font-black text-emerald-400">{distance.toFixed(2)}</span>
          <span className="text-lg font-bold text-slate-500">km</span>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center border border-slate-700 shadow-xl">
        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Current Speed</span>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-orange-400">{currentSpeed.toFixed(1)}</span>
          <span className="text-sm font-bold text-slate-500">km/h</span>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center border border-slate-700 shadow-xl">
        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Pace</span>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-indigo-400">{formatPace(currentPace)}</span>
          <span className="text-sm font-bold text-slate-500">/km</span>
        </div>
      </div>
    </div>
  );
};

export default RunDashboard;
