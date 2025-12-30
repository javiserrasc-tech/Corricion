
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Lucide from 'lucide-react';
import L from 'leaflet';

const h = React.createElement;

// --- UTILS (Antiguo geoUtils.ts) ---
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const formatTime = (ms) => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)));
  return [
    hours > 0 ? hours.toString().padStart(2, '0') : null,
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0')
  ].filter(Boolean).join(':');
};

const formatPace = (paceMinutes) => {
  if (!isFinite(paceMinutes) || paceMinutes <= 0 || isNaN(paceMinutes)) return "0:00";
  const mins = Math.floor(paceMinutes);
  const secs = Math.round((paceMinutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// --- CONSTANTS ---
const RunStatus = {
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED'
};

// --- COMPONENT: MapView ---
const MapView = ({ path, isActive }) => {
  const mapRef = useRef(null);
  const polylineRef = useRef(null);
  const markerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true
    }).setView([40.4168, -3.7038], 16);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapRef.current);
    polylineRef.current = L.polyline([], { 
      color: '#3b82f6', weight: 6, opacity: 0.8, lineCap: 'round', lineJoin: 'round'
    }).addTo(mapRef.current);
    const icon = L.divIcon({ className: 'custom-marker pulse-animation', iconSize: [16, 16], iconAnchor: [8, 8] });
    markerRef.current = L.marker([0, 0], { icon }).addTo(mapRef.current);
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || path.length === 0) return;
    const last = path[path.length - 1];
    const coords = path.map(p => [p.latitude, p.longitude]);
    polylineRef.current?.setLatLngs(coords);
    markerRef.current?.setLatLng([last.latitude, last.longitude]);
    if (isActive) {
      mapRef.current.panTo([last.latitude, last.longitude]);
    } else if (path.length > 1) {
      mapRef.current.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });
    }
  }, [path, isActive]);

  return h('div', { className: "relative w-full h-64 rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-inner bg-slate-900 group" },
    h('div', { ref: containerRef, className: "w-full h-full z-0" }),
    h('div', { className: "absolute top-4 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-blue-500/20 z-[1000] flex items-center gap-2" },
      h('div', { className: "w-2 h-2 rounded-full bg-blue-500 animate-pulse" }),
      h('span', { className: "text-[9px] font-black uppercase tracking-[0.2em] text-blue-400" }, "Posición GPS")
    )
  );
};

// --- COMPONENT: StatCard ---
const StatCard = ({ label, value, unit, color }) => (
  h('div', { className: "bg-slate-900/50 border border-slate-800 p-5 rounded-[2rem] flex flex-col items-center justify-center" },
    h('span', { className: "text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1" }, label),
    h('div', { className: "flex items-baseline gap-1" },
      h('span', { className: `text-3xl font-black ${color} font-mono tracking-tighter` }, value),
      unit && h('span', { className: "text-[10px] font-bold text-slate-600 uppercase" }, unit)
    )
  )
);

// --- COMPONENT: RunDashboard ---
const RunDashboard = ({ elapsedTime, distance, currentSpeed, currentPace }) => (
  h('div', { className: "grid grid-cols-2 gap-4" },
    h('div', { className: "col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col items-center justify-center shadow-2xl relative overflow-hidden" },
      h('div', { className: "absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600" }),
      h('span', { className: "text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-2" }, "Cronómetro"),
      h('span', { className: "text-6xl md:text-7xl font-black text-white font-mono tracking-tighter" }, formatTime(elapsedTime))
    ),
    h(StatCard, { label: "Distancia", value: distance.toFixed(2), unit: "km", color: "text-emerald-400" }),
    h(StatCard, { label: "Velocidad", value: currentSpeed.toFixed(1), unit: "km/h", color: "text-orange-400" }),
    h(StatCard, { label: "Ritmo", value: formatPace(currentPace), unit: "min/km", color: "text-indigo-400" }),
    h(StatCard, { label: "Progreso", value: Math.min(100, (distance / 5) * 100).toFixed(0), unit: "%", color: "text-pink-400" })
  )
);

// --- MAIN APP COMPONENT ---
const App = () => {
  const [status, setStatus] = useState(RunStatus.IDLE);
  const [path, setPath] = useState([]);
  const [distance, setDistance] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [history, setHistory] = useState([]);

  const watchId = useRef(null);
  const timerInterval = useRef(null);
  const startTimeRef = useRef(null);
  const accumulatedTimeRef = useRef(0);

  useEffect(() => {
    const loader = document.getElementById('loading-screen');
    if (loader) {
      setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
      }, 500);
    }
    const saved = localStorage.getItem('corricion_history');
    if (saved) try { setHistory(JSON.parse(saved)); } catch (e) {}
  }, []);

  const stopTracking = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    if (timerInterval.current !== null) window.clearInterval(timerInterval.current);
    watchId.current = null;
    timerInterval.current = null;
  }, []);

  const startTracking = () => {
    if (!navigator.geolocation) return alert("Sin GPS");
    setStatus(RunStatus.RUNNING);
    if (status === RunStatus.IDLE || status === RunStatus.COMPLETED) {
      setPath([]); setDistance(0); setElapsedTime(0); accumulatedTimeRef.current = 0;
    }
    startTimeRef.current = Date.now();
    timerInterval.current = window.setInterval(() => {
      if (startTimeRef.current) setElapsedTime(accumulatedTimeRef.current + (Date.now() - startTimeRef.current));
    }, 1000);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, accuracy } = pos.coords;
        if (accuracy > 50) return;
        setPath(prev => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const d = calculateDistance(last.latitude, last.longitude, latitude, longitude);
            if (d > 0.003) setDistance(dist => dist + d);
          }
          return [...prev, { latitude, longitude, timestamp: pos.timestamp }];
        });
        setCurrentSpeed(speed ? speed * 3.6 : 0);
      },
      null, { enableHighAccuracy: true }
    );
  };

  const handleStop = () => {
    stopTracking();
    const finalDuration = accumulatedTimeRef.current + (startTimeRef.current ? (Date.now() - startTimeRef.current) : 0);
    const session = {
      id: Date.now().toString(),
      startTime: Date.now() - finalDuration,
      distanceKm: distance,
      averagePace: distance > 0 ? (finalDuration / 60000) / distance : 0
    };
    setStatus(RunStatus.COMPLETED);
    setHistory(prev => {
      const h = [session, ...prev].slice(0, 10);
      localStorage.setItem('corricion_history', JSON.stringify(h));
      return h;
    });
  };

  const currentPace = distance > 0 ? (elapsedTime / 60000) / distance : 0;

  return h('div', { className: "flex flex-col h-full bg-slate-950 text-slate-50 overflow-hidden" },
    h('header', { className: "px-6 pt-[calc(1.5rem+var(--sat))] pb-4 flex items-center justify-between border-b border-slate-900 bg-slate-900/50 backdrop-blur-xl z-50" },
      h('div', { className: "flex items-center gap-2" },
        h('div', { className: "bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20" }, h(Lucide.Zap, { className: "w-5 h-5 text-white fill-current" })),
        h('h1', { className: "text-xl font-black italic tracking-tighter uppercase" }, "CORRI", h('span', { className: "text-blue-500" }, "CIÓN"))
      )
    ),
    h('main', { className: "flex-1 overflow-y-auto p-4 space-y-6 pb-40" },
      status !== RunStatus.IDLE ? h('div', { className: "space-y-6" },
        h(MapView, { path, isActive: status === RunStatus.RUNNING }),
        h(RunDashboard, { elapsedTime, distance, currentSpeed, currentPace })
      ) : h('div', { className: "space-y-8 py-4" },
        h('div', { className: "text-center py-6" },
          h('div', { className: "inline-flex p-4 bg-blue-600/10 rounded-full mb-4" }, h(Lucide.Activity, { className: "w-12 h-12 text-blue-500" })),
          h('h2', { className: "text-4xl font-black tracking-tighter uppercase italic" }, "Supera tus Límites"),
          h('p', { className: "text-slate-500 text-xs font-bold uppercase tracking-widest mt-2" }, "Rastreador GPS en tiempo real")
        ),
        h('div', { className: "space-y-3" },
          h('h3', { className: "text-xs font-black uppercase text-slate-400 px-2" }, "Historial"),
          history.length > 0 ? history.map(run => h('div', { key: run.id, className: "p-4 bg-slate-900/50 border border-slate-800 rounded-2xl flex items-center justify-between" },
            h('div', { className: "flex items-center gap-4" },
              h('div', { className: "w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-blue-500" }, h(Lucide.Map, { className: "w-5 h-5" })),
              h('div', null,
                h('div', { className: "font-black text-lg" }, `${run.distanceKm.toFixed(2)} km`),
                h('div', { className: "text-[10px] text-slate-500 uppercase font-bold" }, `${new Date(run.startTime).toLocaleDateString()} • ${formatPace(run.averagePace)}/km`)
              )
            )
          )) : h('div', { className: "p-8 border-2 border-dashed border-slate-900 rounded-[2rem] text-center text-slate-600 text-xs uppercase font-bold" }, "No hay carreras aún")
        )
      )
    ),
    h('footer', { className: "fixed bottom-0 left-0 right-0 p-8 pb-[calc(2rem+var(--sab))] bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent z-[1000]" },
      h('div', { className: "max-w-md mx-auto" },
        status === RunStatus.IDLE ? h('button', { onClick: startTracking, className: "w-full py-6 bg-blue-600 text-white font-black rounded-[2rem] flex items-center justify-center gap-3 active:scale-95" },
          h(Lucide.Play, { className: "w-6 h-6 fill-current" }), h('span', { className: "text-xl uppercase italic" }, "Empezar Carrera")
        ) : status === RunStatus.RUNNING ? h('div', { className: "flex gap-4" },
          h('button', { onClick: () => { stopTracking(); accumulatedTimeRef.current += (Date.now() - startTimeRef.current); setStatus(RunStatus.PAUSED); }, className: "flex-1 py-6 bg-slate-800 text-white font-black rounded-[2rem] flex items-center justify-center gap-2" },
            h(Lucide.Pause, { className: "w-6 h-6" }), h('span', { className: "uppercase italic" }, "Pausa")
          ),
          h('button', { onClick: handleStop, className: "flex-1 py-6 bg-red-600 text-white font-black rounded-[2rem] flex items-center justify-center gap-2" },
            h(Lucide.Square, { className: "w-6 h-6 fill-current" }), h('span', { className: "uppercase italic" }, "Parar")
          )
        ) : status === RunStatus.PAUSED ? h('div', { className: "flex gap-4" },
          h('button', { onClick: startTracking, className: "flex-1 py-6 bg-emerald-600 text-white font-black rounded-[2rem] flex items-center justify-center gap-2" },
            h(Lucide.Play, { className: "w-6 h-6 fill-current" }), h('span', { className: "uppercase italic" }, "Seguir")
          ),
          h('button', { onClick: handleStop, className: "flex-1 py-6 bg-red-600 text-white font-black rounded-[2rem] flex items-center justify-center gap-2" },
            h(Lucide.Square, { className: "w-6 h-6 fill-current" }), h('span', { className: "uppercase italic" }, "Fin")
          )
        ) : h('button', { onClick: () => setStatus(RunStatus.IDLE), className: "w-full py-6 bg-slate-800 text-white font-black rounded-[2rem] flex items-center justify-center gap-2" },
          h(Lucide.RotateCcw, { className: "w-5 h-5" }), h('span', { className: "uppercase italic" }, "Nueva Carrera")
        )
      )
    )
  );
};

export default App;
