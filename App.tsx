
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GeoPoint, RunSession, RunStatus } from './types';
import { calculateDistance } from './utils/geoUtils';
import RunDashboard from './components/RunDashboard';
import MapView from './components/MapView';
import { getRunInsight } from './services/geminiService';
import { Activity, MapPin, Play, Square, Pause, RotateCcw, Sparkles, History, ChevronRight, Zap } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<RunStatus>(RunStatus.IDLE);
  const [path, setPath] = useState<GeoPoint[]>([]);
  const [distance, setDistance] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [recentRuns, setRecentRuns] = useState<RunSession[]>([]);
  const [lastInsight, setLastInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('stride_runs');
    if (saved) {
      setRecentRuns(JSON.parse(saved));
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
  const lastUpdateRef = useRef<number>(0);

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
      alert("GPS no soportado en este dispositivo");
      return;
    }

    // Solicitar permiso explícito primero para despertar el sensor
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
          
          // Filtro de precisión: Ignorar puntos muy imprecisos (> 40m) para evitar saltos locos en el mapa
          if (accuracy > 40) return;

          const newPoint: GeoPoint = { 
            latitude, 
            longitude, 
            timestamp: pos.timestamp, 
            accuracy, 
            speed: speed || 0 
          };

          setPath(prevPath => {
            if (prevPath.length > 0) {
              const lastPoint = prevPath[prevPath.length - 1];
              const d = calculateDistance(lastPoint.latitude, lastPoint.longitude, newPoint.latitude, newPoint.longitude);
              
              // Evitar sumar micro-movimientos si estamos parados (ruido del GPS)
              if (d > 0.002) { // más de 2 metros
                setDistance(prev => prev + d);
              }
            }
            return [...prevPath, newPoint];
          });
          
          setCurrentSpeed(speed ? speed * 3.6 : 0);
        },
        (err) => console.error("Error GPS:", err),
        { 
          enableHighAccuracy: true, 
          maximumAge: 0, 
          timeout: 5000 
        }
      );
    }, (err) => {
      alert("Por favor, activa el GPS para poder trackear tu carrera.");
    });
  };

  const handleStop = async () => {
    stopTracking();
    const endTime = Date.now();
    const durationMinutes = (endTime - (startTimeRef.current || endTime)) / 60000;
    const avgPace = durationMinutes / (distance || 0.001);

    const newRun: RunSession = {
      id: Math.random().toString(36).substr(2, 9),
      startTime: startTimeRef.current || Date.now(),
      endTime, 
      path, 
      distanceKm: distance, 
      averagePace: avgPace, 
      status: RunStatus.COMPLETED
    };

    setStatus(RunStatus.COMPLETED);
    setIsAnalyzing(true);
    const insight = await getRunInsight(newRun);
    newRun.aiInsight = insight;
    setLastInsight(insight);
    setIsAnalyzing(false);
    saveRun(newRun);
  };

  const currentPace = (elapsedTime / 60000) / (distance || 0.0001);

  return (
    <div className="h-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      <header className="p-6 flex items-center justify-between border-b border-slate-800 bg-slate-900/50 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
            <Zap className="w-5 h-5 text-white fill-current" />
          </div>
          <h1 className="text-xl font-black italic uppercase tracking-tighter">CORRI<span className="text-blue-500">CIÓN</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status === RunStatus.RUNNING ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {status === RunStatus.RUNNING ? 'GPS Activo' : 'Standby'}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-32">
        {status !== RunStatus.IDLE ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            <MapView path={path} isActive={status === RunStatus.RUNNING} />
            
            <RunDashboard 
              status={status} 
              distance={distance} 
              elapsedTime={elapsedTime} 
              currentPace={currentPace} 
              currentSpeed={currentSpeed}
            />

            {(isAnalyzing || lastInsight) && (
              <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 p-6 rounded-3xl border border-blue-500/20 shadow-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Análisis Coach Gemini</span>
                </div>
                {isAnalyzing ? (
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Procesando datos...</span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-100 leading-relaxed font-medium italic">"{lastInsight}"</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center text-center space-y-8">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600/20 blur-[100px] rounded-full"></div>
              <div className="relative w-32 h-32 bg-slate-900 rounded-[2.5rem] flex items-center justify-center border border-slate-800 shadow-2xl rotate-3">
                <Activity className="w-16 h-16 text-blue-500 -rotate-3" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
                MÁS RÁPIDO.<br/><span className="text-blue-500">MÁS LEJOS.</span>
              </h2>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em]">Ready to run?</p>
            </div>
            
            <div className="w-full pt-4 space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                  <History className="w-3 h-3" /> Historial
                </div>
              </div>
              <div className="space-y-3">
                {recentRuns.length > 0 ? recentRuns.map((run) => (
                  <button 
                    key={run.id} 
                    onClick={() => { 
                      setPath(run.path); 
                      setDistance(run.distanceKm); 
                      setElapsedTime((run.endTime || 0) - run.startTime); 
                      setLastInsight(run.aiInsight || null); 
                      setStatus(RunStatus.COMPLETED); 
                    }} 
                    className="w-full bg-slate-900/40 p-5 rounded-3xl border border-slate-800/50 flex items-center justify-between hover:bg-slate-800 hover:border-blue-500/30 transition-all group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-800 p-3 rounded-2xl group-hover:bg-blue-600 transition-colors">
                        <MapPin className="w-5 h-5 text-blue-500 group-hover:text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-black text-white text-base tracking-tight">{run.distanceKm.toFixed(2)} <span className="text-[10px] text-slate-500 uppercase">km</span></div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{new Date(run.startTime).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-blue-400 transition-colors" />
                  </button>
                )) : (
                  <div className="bg-slate-900/20 p-16 rounded-[2rem] border-2 border-dashed border-slate-800/50 flex flex-col items-center gap-4">
                    <div className="p-4 bg-slate-900 rounded-full">
                      <Zap className="w-6 h-6 text-slate-800" />
                    </div>
                    <p className="text-slate-600 text-[10px] uppercase font-black tracking-widest">Aún no hay actividad</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent safe-bottom z-50">
        <div className="max-w-md mx-auto flex gap-4">
          {status === RunStatus.IDLE && (
            <button 
              onClick={startTracking} 
              className="w-full bg-blue-600 active:scale-95 text-white font-black py-6 rounded-[2rem] shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-3 transition-all hover:bg-blue-500"
            >
              <Play className="w-7 h-7 fill-current" />
              <span className="text-xl uppercase italic tracking-tighter">Iniciar Carrera</span>
            </button>
          )}
          {(status === RunStatus.RUNNING || status === RunStatus.PAUSED) && (
            <>
              <button 
                onClick={() => { 
                  if (status === RunStatus.RUNNING) {
                    stopTracking(); 
                    setStatus(RunStatus.PAUSED); 
                  } else {
                    startTracking();
                  }
                }} 
                className={`flex-1 ${status === RunStatus.PAUSED ? 'bg-blue-600' : 'bg-slate-800'} text-white font-black py-6 rounded-[2rem] border border-slate-700 flex items-center justify-center gap-3 transition-all active:scale-95`}
              >
                {status === RunStatus.RUNNING ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current" />}
                <span className="uppercase text-xs font-black tracking-widest">{status === RunStatus.RUNNING ? 'Pausar' : 'Resumir'}</span>
              </button>
              <button 
                onClick={handleStop} 
                className="flex-1 bg-red-600 text-white font-black py-6 rounded-[2rem] shadow-xl flex items-center justify-center gap-3 active:scale-95 hover:bg-red-500"
              >
                <Square className="w-7 h-7 fill-current" />
                <span className="uppercase text-xs font-black tracking-widest">Stop</span>
              </button>
            </>
          )}
          {status === RunStatus.COMPLETED && (
            <button 
              onClick={() => setStatus(RunStatus.IDLE)} 
              className="w-full bg-slate-800 text-white font-black py-6 rounded-[2rem] flex items-center justify-center gap-3 active:scale-95 hover:bg-slate-700"
            >
              <RotateCcw className="w-7 h-7" />
              <span className="text-xl uppercase italic tracking-tighter">Nueva Sesión</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default App;
