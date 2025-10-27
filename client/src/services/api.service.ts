import axios from 'axios';
import { Team, Player, Match, Over, BallOutcome, BallData, BowlerRotationResult } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  getAll: () => api.get<Player[]>('/players'),
  getById: (id: string) => api.get<Player>(`/players/${id}`),
  create: (data: Omit<Player, '_id'>) => api.post<Player>('/players', data),
  update: (id: string, data: Player) => api.put<Player>(`/players/${id}`, data),
  delete: (id: string) => api.delete(`/players/${id}`),
  promoteToAdmin: (playerId: string, userId: string) => 
    api.put(`/players/${playerId}/promote`, {}, { headers: { 'user-id': userId } }),
  demoteFromAdmin: (playerId: string, userId: string) => 
    api.put(`/players/${playerId}/demote`, {}, { headers: { 'user-id': userId } }),
  updatePlayerTeams: (playerUpdates: { playerId: string; teams: string[] }[]) => 
    api.put('/players/update-teams', { playerUpdates }),
};

export const teamService = {
  getAll: () => api.get<Team[]>('/teams'),
  getById: (id: string) => api.get<Team>(`/teams/${id}`),
  create: (data: Partial<Team>) => api.post<Team>('/teams', data),
  update: (id: string, data: Partial<Team>) => api.put<Team>(`/teams/${id}`, data),
  delete: (id: string) => api.delete(`/teams/${id}`),
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