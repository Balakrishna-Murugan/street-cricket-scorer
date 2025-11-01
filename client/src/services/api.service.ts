import axios from 'axios';
import { Team, Player, Match, Over, BallOutcome, BallData, BowlerRotationResult } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach user-id header automatically from localStorage if available
api.interceptors.request.use((config) => {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user && user._id) {
        // Axios v1 uses AxiosHeaders; set header via set if available
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (config.headers && typeof (config.headers as any).set === 'function') {
          // @ts-ignore
          (config.headers as any).set('user-id', user._id);
          (config.headers as any).set('authorization', `Bearer ${user._id}`);
        } else if (config.headers) {
          // fallback for plain object
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          config.headers['user-id'] = user._id;
          config.headers['Authorization'] = `Bearer ${user._id}`;
        } else {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          config.headers = { 'user-id': user._id, 'Authorization': `Bearer ${user._id}` };
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return config;
}, (error) => Promise.reject(error));

// Authentication interfaces
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  username: string;
  password: string;
  age?: number;
  role?: 'batsman' | 'bowler' | 'all-rounder';
  userRole?: 'player' | 'admin' | 'superadmin' | 'viewer';
}

export interface GuestLoginRequest {
  name: string;
}

export interface AuthResponse {
  message: string;
  user: Player & {
    username?: string;
    email?: string;
    userRole?: string;
    isGuest?: boolean;
    guestLimitations?: {
      maxMatches: number;
      basicScoringOnly: boolean;
      expiresAt: string;
    };
  };
}

export interface CheckEmailResponse {
  exists: boolean;
  user?: Player & {
    username?: string;
    email?: string;
    userRole?: string;
    isGuest?: boolean;
  };
}

// Authentication service
export const authService = {
  login: (data: LoginRequest) => api.post<AuthResponse>('/auth/login', data),
  register: (data: RegisterRequest) => api.post<AuthResponse>('/auth/register', data),
  guestLogin: (data: GuestLoginRequest) => api.post<AuthResponse>('/auth/guest-login', data),
  checkEmail: (email: string) => api.post<CheckEmailResponse>('/auth/check-email', { email }),
};

export const playerService = {
  getAll: (userId?: string) => {
    const params = userId ? { userId } : {};
    const headers = userId ? { 'user-id': userId } : {};
    return api.get<Player[]>('/players', { params, headers });
  },
  getById: (id: string) => api.get<Player>(`/players/${id}`),
  create: (data: Omit<Player, '_id'>) => api.post<Player>('/players', data),
  update: (id: string, data: Player) => api.put<Player>(`/players/${id}`, data),
  delete: (id: string) => api.delete(`/players/${id}`),
  getConflicts: (id: string) => api.get<{ conflicts: { _id: string; label: string }[] }>(`/players/${id}/conflicts`),
  promoteToAdmin: (playerId: string, userId: string) => 
    api.put(`/players/${playerId}/promote`, {}, { headers: { Authorization: `Bearer ${userId}` } }),
  demoteFromAdmin: (playerId: string, userId: string) => 
    api.put(`/players/${playerId}/demote`, {}, { headers: { Authorization: `Bearer ${userId}` } }),
  updatePlayerTeams: (playerUpdates: { playerId: string; teams: string[] }[]) => 
    api.put('/players/update-teams', { playerUpdates }),
};

export const teamService = {
  getAll: (userId?: string) => {
    const params = userId ? { userId } : {};
    const headers = userId ? { 'user-id': userId } : {};
    return api.get<Team[]>('/teams', { params, headers });
  },
  getById: (id: string) => api.get<Team>(`/teams/${id}`),
  create: (data: Partial<Team>) => api.post<Team>('/teams', data),
  update: (id: string, data: Partial<Team>) => api.put<Team>(`/teams/${id}`, data),
  delete: (id: string) => api.delete(`/teams/${id}`),
  getConflicts: (id: string) => api.get<{ conflicts: { _id: string; label: string }[] }>(`/teams/${id}/conflicts`),
};

export const overService = {
  getByMatchId: (matchId: string) => api.get<Over[]>(`/matches/${matchId}/overs`),
  create: (data: Omit<Over, '_id'>) => api.post<Over>('/overs', data),
  update: (id: string, data: Partial<Over>) => api.put<Over>(`/overs/${id}`, data),
  getCurrentOver: (matchId: string) => api.get<Over>(`/matches/${matchId}/current-over`),
  addBall: (overId: string, ball: BallOutcome) => api.post<Over>(`/overs/${overId}/balls`, ball),
};

export const matchService = {
  getAll: (userId?: string) => {
    const params = userId ? { userId } : {};
    return api.get<Match[]>('/matches', { params });
  },
  getById: (id: string) => api.get<Match>(`/matches/${id}`),
  create: (data: Omit<Match, '_id'>) => api.post<Match>('/matches', data),
  update: (id: string, data: Partial<Match>) => api.put<Match>(`/matches/${id}`, data),
  updateScore: (matchId: string, data: Match) => api.put<Match>(`/matches/${matchId}/score`, data),
  delete: (id: string) => api.delete(`/matches/${id}`),
  sendSummary: (matchId: string, email: string) => api.post(`/matches/${matchId}/send-summary`, { email }),
  
  // NEW ENHANCED BALL-BY-BALL TRACKING METHODS
  processBall: (matchId: string, ballData: BallData) => 
    api.post<Match>(`/matches/${matchId}/ball`, ballData),
    
  getBowlerRotation: (matchId: string) => 
    api.get<BowlerRotationResult>(`/matches/${matchId}/bowler-rotation`),
    
  startNewOver: (matchId: string, bowlerId: string) => 
    api.post<Match>(`/matches/${matchId}/new-over`, { bowlerId }),
    
  updateBatsmen: (matchId: string, onStrikeBatsman: string, offStrikeBatsman: string) => 
    api.put<Match>(`/matches/${matchId}/batsmen`, { onStrikeBatsman, offStrikeBatsman }),
};