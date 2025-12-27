
export interface GeoPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
  speed: number | null;
}

export interface RunSession {
  id: string;
  startTime: number;
  endTime: number | null;
  path: GeoPoint[];
  distanceKm: number;
  averagePace: number; // minutes per km
  status: RunStatus;
  aiInsight?: string;
}

export enum RunStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}

export interface DashboardStats {
  totalDistance: number;
  totalRuns: number;
  averagePace: number;
}
