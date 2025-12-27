
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GeoPoint } from '../types.ts';

interface MapViewProps {
  path: GeoPoint[];
  isActive: boolean;
}

const MapView: React.FC<MapViewProps> = ({ path, isActive }) => {
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true
    }).setView([40.4168, -3.7038], 16); // Madrid por defecto

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapRef.current);

    polylineRef.current = L.polyline([], { 
      color: '#3b82f6', 
      weight: 6, 
      opacity: 0.8,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(mapRef.current);
    
    const icon = L.divIcon({ 
      className: 'custom-marker pulse-animation', 
      iconSize: [16, 16], 
      iconAnchor: [8, 8] 
    });
    markerRef.current = L.marker([0, 0], { icon }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || path.length === 0) return;
    
    const last = path[path.length - 1];
    const coords = path.map(p => [p.latitude, p.longitude] as L.LatLngExpression);
    
    polylineRef.current?.setLatLngs(coords);
    markerRef.current?.setLatLng([last.latitude, last.longitude]);

    if (isActive) {
      mapRef.current.panTo([last.latitude, last.longitude]);
    } else if (path.length > 1) {
      mapRef.current.fitBounds(polylineRef.current!.getBounds(), { padding: [50, 50] });
    }
  }, [path, isActive]);

  return (
    <div className="relative w-full h-64 rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-inner bg-slate-900 group">
      <div ref={containerRef} className="w-full h-full z-0" />
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-blue-500/20 z-[1000] flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">Posición GPS</span>
      </div>
    </div>
  );
};

export default MapView;
