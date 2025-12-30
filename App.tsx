
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, History, Zap, ChevronRight, Activity, Map as MapIcon, RotateCcw } from 'lucide-react';
import { RunStatus, RunSession, GeoPoint } from './types.ts';
import { calculateDistance, formatTime, formatPace } from './utils/geoUtils.ts';
import MapView from './components/MapView.tsx';
import RunDashboard from './components/RunDashboard.tsx';

const App: React.FC = () => {
  const [status, setStatus] = useState<RunStatus>(RunStatus.IDLE);
  const [path, setPath] = useState<GeoPoint[]>([]);
  const [distance, setDistance] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [history, setHistory] = useState<RunSession[]>([]);

  const watchId = useRef<number | null>(null);
  const timerInterval = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef(0);

  // Manejo de la pantalla de carga inicial
  useEffect(() => {
    const loader = document.getElementById('loading-screen');
    if (loader) {
      const timeout = setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, []);

  // Cargar historial
  useEffect(() => {
    const saved = localStorage.getItem('corricion_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Error cargando historial");
      }
    }
  }, []);

  const stopTracking = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (timerInterval.current !== null) {
      window.clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  }, []);

  const startTracking = () => {
    if (!navigator.geolocation) {
      alert("Tu dispositivo no soporta GPS.");
      return;
    }

    setStatus(RunStatus.RUNNING);
    
    if (status === RunStatus.IDLE || status === RunStatus.COMPLETED) {
      setPath([]);
      setDistance(0);
      setElapsedTime(0);
      accumulatedTimeRef.current = 0;
    }

    startTimeRef.current = Date.now();

    // Timer
    timerInterval.current = window.setInterval(() => {
      if (startTimeRef.current) {
        const now = Date.now();
        const sessionTime = now - startTimeRef.current;
        setElapsedTime(accumulatedTimeRef.current + sessionTime);
      }
    }, 1000);

    // GPS Watch
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, accuracy } = pos.coords;
        if (accuracy > 50) return; // Ignorar posiciones imprecisas

        const newPoint: GeoPoint = {
          latitude,
          longitude,
          timestamp: pos.timestamp,
          accuracy,
          speed: speed || 0
        };

        setPath(prev => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const d = calculateDistance(last.latitude, last.longitude, latitude, longitude);
            if (d > 0.003) setDistance(dist => dist + d); // Solo sumar si se movió > 3m
          }
          return [...prev, newPoint];
        });

        setCurrentSpeed(speed ? speed * 3.6 : 0); // m/s a km/h
      },
      (err) => {
        console.warn("GPS Error:", err.message);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  };

  const handlePause = () => {
    stopTracking();
    if (startTimeRef.current) {
      accumulatedTimeRef.current += (Date.now() - startTimeRef.current);
    }
    setStatus(RunStatus.PAUSED);
  };

  const handleStop = () => {
    stopTracking();
    if (startTimeRef.current && status === RunStatus.RUNNING) {
      accumulatedTimeRef.current += (Date.now() - startTimeRef.current);
    }
    
    const finalDuration = accumulatedTimeRef.current;
    const avgPace = distance > 0 ? (finalDuration / 60000) / distance : 0;
    
    const session: RunSession = {
      id: Date.now().toString(),
      startTime: Date.now() - finalDuration,
      endTime: Date.now(),
      path: [...path],
      distanceKm: distance,
      averagePace: avgPace,
      status: RunStatus.COMPLETED
    };

    setStatus(RunStatus.COMPLETED);

    // Guardar en historial
    setHistory(prev => {
      const newHistory = [session, ...prev].slice(0, 10);
      localStorage.setItem('corricion_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const currentPace = distance > 0 ? (elapsedTime / 60000) / distance : 0;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-50 overflow-hidden">
      {/* Header */}
      <header className="px-6 pt-[calc(1.5rem+var(--sat))] pb-4 flex items-center justify-between border-b border-slate-900 bg-slate-900/50 backdrop-blur-xl z-50">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
            <Zap className="w-5 h-5 text-white fill-current" />
          </div>
          <h1 className="text-xl font-black italic tracking-tighter uppercase">CORRI<span className="text-blue-500">CIÓN</span></h1>
        </div>
        {status === RunStatus.RUNNING && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full animate-pulse">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">LIVE</span>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">
        {status !== RunStatus.IDLE ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <MapView path={path} isActive={status === RunStatus.RUNNING} />
            
            <RunDashboard 
              elapsedTime={elapsedTime} 
              distance={distance} 
              currentSpeed={currentSpeed} 
              currentPace={currentPace} 
            />
          </div>
        ) : (
          <div className="space-y-8 py-4">
            <div className="text-center space-y-2 py-6">
              <div className="inline-flex p-4 bg-blue-600/10 rounded-full mb-4 border border-blue-500/10">
                <Activity className="w-12 h-12 text-blue-500" />
              </div>
              <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-none">Supera tus<br/>Límites.</h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Tu progreso en tiempo real</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                  <History className="w-4 h-4" /> Historial Reciente
                </h3>
              </div>
              
              {history.length > 0 ? (
                <div className="space-y-3">
                  {history.map(run => (
                    <div key={run.id} className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl flex items-center justify-between group active:bg-slate-800 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-blue-500">
                          <MapIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-black text-lg">{run.distanceKm.toFixed(2)} km</div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                            {new Date(run.startTime).toLocaleDateString()} • {formatPace(run.averagePace)}/km
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-slate-400 transition-colors" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 border-2 border-dashed border-slate-900 rounded-[2.5rem] text-center">
                  <p className="text-slate-600 font-bold text-sm uppercase">¿A qué esperas?<br/>Empieza a correr.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-8 pb-[calc(2rem+var(--sab))] bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent z-[1000]">
        <div className="max-w-md mx-auto">
          {status === RunStatus.IDLE && (
            <button 
              onClick={startTracking}
              className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-[2rem] shadow-2xl shadow-blue-500/40 flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <Play className="w-6 h-6 fill-current" />
              <span className="text-xl uppercase italic tracking-tighter">Empezar Carrera</span>
            </button>
          )}

          {status === RunStatus.RUNNING && (
            <div className="flex gap-4">
              <button 
                onClick={handlePause}
                className="flex-1 py-6 bg-slate-800 text-white font-black rounded-[2rem] border border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Pause className="w-6 h-6" />
                <span className="uppercase italic tracking-tighter">Pausa</span>
              </button>
              <button 
                onClick={handleStop}
                className="flex-1 py-6 bg-red-600 text-white font-black rounded-[2rem] shadow-xl shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Square className="w-6 h-6 fill-current" />
                <span className="uppercase italic tracking-tighter">Parar</span>
              </button>
            </div>
          )}

          {status === RunStatus.PAUSED && (
            <div className="flex gap-4">
              <button 
                onClick={startTracking}
                className="flex-1 py-6 bg-emerald-600 text-white font-black rounded-[2rem] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-6 h-6 fill-current" />
                <span className="uppercase italic tracking-tighter">Seguir</span>
              </button>
              <button 
                onClick={handleStop}
                className="flex-1 py-6 bg-red-600 text-white font-black rounded-[2rem] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Square className="w-6 h-6 fill-current" />
                <span className="uppercase italic tracking-tighter">Fin</span>
              </button>
            </div>
          )}

          {status === RunStatus.COMPLETED && (
            <button 
              onClick={() => setStatus(RunStatus.IDLE)}
              className="w-full py-6 bg-slate-800 text-white font-black rounded-[2rem] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span className="uppercase italic tracking-tighter">Nueva Carrera</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default App;
