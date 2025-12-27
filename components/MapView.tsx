
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
      attributionControl: false
    }).setView([0, 0], 16);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapRef.current);

    polylineRef.current = L.polyline([], { color: '#3b82f6', weight: 6, opacity: 0.9 }).addTo(mapRef.current);
    
    const icon = L.divIcon({ className: 'custom-marker pulse-animation', iconSize: [14, 14], iconAnchor: [7, 7] });
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
    } else {
      mapRef.current.fitBounds(polylineRef.current!.getBounds(), { padding: [30, 30] });
    }
  }, [path, isActive]);

  return (
    <div className="relative w-full h-72 rounded-[2rem] overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-4 right-4 bg-slate-950/80 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-blue-400 z-[1000] border border-blue-500/20">GPS Live Track</div>
    </div>
  );
};

export default MapView;
