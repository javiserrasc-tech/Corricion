
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GeoPoint } from '../types';

interface MapViewProps {
  path: GeoPoint[];
  isActive: boolean;
}

const MapView: React.FC<MapViewProps> = ({ path, isActive }) => {
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Inicializar mapa si no existe
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([0, 0], 16);

      // Capa de mapa oscuro (CartoDB Dark Matter)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapRef.current);

      // Línea de recorrido
      polylineRef.current = L.polyline([], {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.8,
        lineJoin: 'round'
      }).addTo(mapRef.current);

      // Marcador de posición actual
      const icon = L.divIcon({
        className: 'custom-marker pulse-animation',
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });
      markerRef.current = L.marker([0, 0], { icon }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || path.length === 0) return;

    const latLngs = path.map(p => [p.latitude, p.longitude] as L.LatLngExpression);
    const lastPoint = latLngs[latLngs.length - 1];

    // Actualizar línea
    if (polylineRef.current) {
      polylineRef.current.setLatLngs(latLngs);
    }

    // Actualizar marcador
    if (markerRef.current) {
      markerRef.current.setLatLng([path[path.length-1].latitude, path[path.length-1].longitude]);
    }

    // Centrar mapa
    if (isActive) {
      mapRef.current.panTo(lastPoint);
    } else if (path.length > 1) {
      // Si ha terminado, ajustar vista a todo el trayecto
      mapRef.current.fitBounds(polylineRef.current!.getBounds(), { padding: [20, 20] });
    } else {
      mapRef.current.setView(lastPoint, 16);
    }
  }, [path, isActive]);

  return (
    <div className="relative w-full h-64 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-4 right-4 z-[1000] bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
        Live Map
      </div>
    </div>
  );
};

export default MapView;
