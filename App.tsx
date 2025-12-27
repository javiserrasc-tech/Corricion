
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GeoPoint, RunSession, RunStatus } from './types.ts';
import { calculateDistance } from './utils/geoUtils.ts';
import RunDashboard from './components/RunDashboard.tsx';
import MapView from './components/MapView.tsx';
import { getRunInsight } from './services/geminiService.ts';
import { Activity, Play, Square, Pause, RotateCcw, Sparkles, History, ChevronRight, Zap } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<RunStatus>(RunStatus.IDLE);
  const [path, setPath] = useState<GeoPoint[]>([]);
  const [distance, setDistance] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [recentRuns, setRecentRuns] = useState<RunSession[]>([]);
  const [lastInsight, setLastInsight] = useState<string | null>(null);

  // EFECTO CRÍTICO: Quitar pantalla de carga
  useEffect(() => {
    const loader = document.getElementById('loading-screen');
    if (loader) {
      setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
      }, 500);
    }

    const saved = localStorage.getItem('stride_runs');
    if (saved) {
      try {
        setRecentRuns(JSON.parse(saved));
      } catch(e) {
        console.error("Error cargando historial", e);
      }
    }
  }, []);

  const saveRun = (run: RunSession) => {
    const updated = [run, ...recentRuns].slice(0, 10);
    setRecentRuns(updated);
    localStorage.setItem('stride_runs', JSON.stringify(updated));
  };

  const watchId = useRef<number | null>(null);
  const timerId = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const stopTracking = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (timerId.current !== null) {
      window.clearInterval(timerId.current);
      timerId.current = null;
    }
  }, []);

  const startTracking = () => {
    if (!navigator.geolocation) {
      alert("GPS no disponible en este dispositivo");
      return;
    }

    navigator.geolocation.getCurrentPosition(() => {
      setStatus(RunStatus.RUNNING);
      
      if (status === RunStatus.IDLE || status === RunStatus.COMPLETED) {
        startTimeRef.current = Date.now();
        setPath([]);
        setDistance(0);
        setElapsedTime(0);
        setLastInsight(null);
      }

      timerId.current = window.setInterval(() => {
        if (startTimeRef.current && status === RunStatus.RUNNING) {
          setElapsedTime(Date.now() - startTimeRef.current);
        }
      }, 1000);

      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, speed, accuracy } = pos.coords;
          if (accuracy > 50) return;

          const newPoint: GeoPoint = { 
            latitude, longitude, timestamp: pos.timestamp, accuracy, speed: speed || 0 
          };

          setPath(prevPath => {
            if (prevPath.length > 0) {
              const last = prevPath[prevPath.length - 1];
              const d = calculateDistance(last.latitude, last.longitude, newPoint.latitude, newPoint.longitude);
              if (d > 0.003) setDistance(prev => prev + d);
            }
            return [...prevPath, newPoint];
          });
          setCurrentSpeed(speed ? speed * 3.6 : 0);
        },
        (err) => console.error("GPS Error:", err),
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    }, () => alert("Por favor, permite el acceso a la ubicación para usar el tracker"));
  };

  const handleStop = async () => {
    stopTracking();
    const durationMin = (Date.now() - (startTimeRef.current || Date.now())) / 60000;
    const newRun: RunSession = {
      id: Date.now().toString(),
      startTime: startTimeRef.current || Date.now(),
      endTime: Date.now(), 
      path, 
      distanceKm: distance, 
      averagePace: durationMin / (distance || 0.001),
      status: RunStatus.COMPLETED
    };

    setStatus(RunStatus.COMPLETED);
    const insight = await getRunInsight(newRun);
    newRun.aiInsight = insight;
    setLastInsight(insight);
    saveRun(newRun);
  };

  const currentPace = (elapsedTime / 60000) / (distance || 0.0001);

  return (
    <div className="h-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      <header className="p-6 pt-[calc(1.5rem+var(--sat))] flex items-center justify-between bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-500 fill-current" />
          <h1 className="text-xl font-black tracking-tighter italic uppercase">CORRI<span className="text-blue-500">CIÓN</span></h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
          <div className={`w-1.5 h-1.5 rounded-full ${status === RunStatus.RUNNING ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
          <span className="text-[9px] font-black uppercase text-slate-400">GPS</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-40">
        {status !== RunStatus.IDLE ? (
          <div className="space-y-6">
            <MapView path={path} isActive={status === RunStatus.RUNNING} />
            <RunDashboard elapsedTime={elapsedTime} distance={distance} currentSpeed={currentSpeed} currentPace={currentPace} status={status} />
            {lastInsight && (
              <div className="p-5 bg-blue-600/10 border border-blue-500/20 rounded-3xl animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-2 mb-2 text-blue-400">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">IA Coach Insight</span>
                </div>
                <p className="text-sm italic leading-relaxed text-slate-200">"{lastInsight}"</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 space-y-12">
            <div className="p-12 bg-blue-600/10 rounded-full border border-blue-500/10 animate-pulse">
              <Activity className="w-20 h-20 text-blue-500" />
            </div>
            <div className="text-center">
              <h2 className="text-4xl font-black italic uppercase leading-none mb-2">RUN<br/>SMART.</h2>
              <p className="text-[10px] font-black text-slate-500 tracking-[0.4em] uppercase">Inicia tu sesión</p>
            </div>
            
            <div className="w-full space-y-4">
              <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest px-2 flex items-center gap-2">
                <History className="w-3 h-3" /> Actividad Reciente
              </p>
              {recentRuns.length > 0 ? recentRuns.map(run => (
                <div key={run.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-lg font-black">{run.distanceKm.toFixed(2)} km</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">{new Date(run.startTime).toLocaleDateString()}</p>
                  </div>
                  <ChevronRight className="text-slate-700" />
                </div>
              )) : (
                <div className="p-10 border-2 border-dashed border-slate-800 rounded-3xl text-center">
                  <p className="text-xs font-bold text-slate-600 uppercase">Sin historial</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-8 pb-[calc(2rem+var(--sab))] bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          {status === RunStatus.IDLE && (
            <button onClick={startTracking} className="w-full py-6 bg-blue-600 text-white font-black rounded-3xl shadow-2xl shadow-blue-500/40 flex items-center justify-center gap-3 active:scale-95 transition-transform">
              <Play className="fill-current" /> <span className="text-xl uppercase italic">Empezar</span>
            </button>
          )}
          {status === RunStatus.RUNNING && (
            <div className="flex gap-4">
              <button onClick={() => { stopTracking(); setStatus(RunStatus.PAUSED); }} className="flex-1 py-6 bg-slate-800 text-white font-black rounded-3xl border border-slate-700 active:scale-95 transition-transform">
                <Pause className="mx-auto" />
              </button>
              <button onClick={handleStop} className="flex-1 py-6 bg-red-600 text-white font-black rounded-3xl shadow-2xl shadow-red-500/30 active:scale-95 transition-transform">
                <Square className="mx-auto fill-current" />
              </button>
            </div>
          )}
          {status === RunStatus.PAUSED && (
            <button onClick={startTracking} className="w-full py-6 bg-emerald-600 text-white font-black rounded-3xl active:scale-95 transition-transform">
              <Play className="mx-auto fill-current" />
            </button>
          )}
          {status === RunStatus.COMPLETED && (
            <button onClick={() => setStatus(RunStatus.IDLE)} className="w-full py-6 bg-slate-800 text-white font-black rounded-3xl active:scale-95 transition-transform">
              <RotateCcw className="mx-auto" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default App;
