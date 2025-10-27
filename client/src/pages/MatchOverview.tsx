import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  useTheme,
  useMediaQuery,
  Stack
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { Match, Team } from '../types';
import { matchService, teamService } from '../services/api.service';
import SummarizeIcon from '@mui/icons-material/Summarize';
import CommentIcon from '@mui/icons-material/Comment';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SportsIcon from '@mui/icons-material/Sports';

const MatchOverview: React.FC = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [match, setMatch] = useState<Match | null>(null);
  const [teams, setTeams] = useState<{ [key: string]: Team }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get user role for admin buttons
  const userRole = localStorage.getItem('userRole') || 'viewer';
  const currentUserId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!)._id : null;
  const isAdmin = userRole === 'admin';
  const isSuperAdmin = userRole === 'superadmin';
  const isPlayer = userRole === 'player';
  const isViewer = userRole === 'viewer';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('MatchOverview: Fetching data for matchId:', matchId);
        
        if (!matchId) {
          setError('No match ID provided');
          setLoading(false);
          return;
        }

        // Fetch match details
        const matchResponse = await matchService.getById(matchId);
        console.log('MatchOverview: Match data fetched:', matchResponse.data);
        setMatch(matchResponse.data);

        // Fetch all teams
        const teamsResponse = await teamService.getAll();
        const teamsMap = teamsResponse.data.reduce((acc: any, team: Team) => {
          acc[team._id!] = team;
          return acc;
        }, {});
        setTeams(teamsMap);
      } catch (err) {
        console.error('Error fetching match data:', err);
        setError(`Failed to load match data: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Store in sessionStorage that user came from overview (for breadcrumb tracking)
    sessionStorage.setItem('lastMatchNavigation', 'overview');
  }, [matchId]);

  const getTeamName = (team: string | { _id: string; name: string }): string => {
    if (typeof team === 'object' && team.name) {
      return team.name;
    }
    return teams[team as string]?.name || (team as string);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'warning';
      case 'upcoming': return 'info';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'Live';
      case 'upcoming': return 'Upcoming';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMatchResult = () => {
    if (!match || match.status !== 'completed') return null;
    
    // You can enhance this based on your match data structure
    if (match.result) {
      return match.result;
    }
    
    return 'Match Completed';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          🏏 <span className="loading-spinner">⏳</span> Loading Match Details...
        </Typography>
      </Box>
    );
  }

  if (error || !match) {
    return (
      <Box>
        <Typography color="error">{error || 'Match not found'}</Typography>
      </Box>
    );
  }

  // Calculate if user can manage this match (inside render where match data is available)
  const canManageMatch = isAdmin || isSuperAdmin || ((isPlayer || isViewer) && match?.createdBy === currentUserId);

  return (
    <Box maxWidth="lg" sx={{ py: isMobile ? 1 : 3, px: isMobile ? 1 : 3, mx: 'auto' }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: isMobile ? 1 : 3, 
          mb: 3,
          background: 'linear-gradient(135deg, #020e43 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        {/* Match Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            component="h1" 
            gutterBottom 
            sx={{ fontWeight: 'bold', color: 'primary.main' }}
          >
            {getTeamName(match.team1)} vs {getTeamName(match.team2)}
          </Typography>
          
          <Stack 
            direction={isMobile ? "column" : "row"} 
            spacing={2} 
            justifyContent="center" 
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <Chip 
              label={getStatusLabel(match.status)} 
              color={getStatusColor(match.status) as any}
              size="medium"
            />
            {match.result && (
              <Typography 
                variant="subtitle1" 
                sx={{ fontWeight: 'medium', color: 'success.main' }}
              >
                {getMatchResult()}
              </Typography>
            )}
          </Stack>
        </Box>

        {/* Match Details */}
        <Box sx={{ mb: 4 }}>
          <Stack direction={isMobile ? "column" : "row"} spacing={3}>
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <CalendarTodayIcon color="primary" sx={{ mb: 1 }} />
                <Typography variant="subtitle2" color="textSecondary">
                  Date & Time
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {formatDate(match.date)}
                </Typography>
              </CardContent>
            </Card>
            
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <LocationOnIcon color="primary" sx={{ mb: 1 }} />
                <Typography variant="subtitle2" color="textSecondary">
                  Venue
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {match.venue || 'Not specified'}
                </Typography>
              </CardContent>
            </Card>
            
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <SportsIcon color="primary" sx={{ mb: 1 }} />
                <Typography variant="subtitle2" color="textSecondary">
                  Format
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {match.overs} Overs
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Box>

        {/* Navigation Buttons */}
        <Box sx={{ textAlign: 'center' }}>
          
          <Stack 
            direction={isMobile ? "column" : "row"} 
            spacing={2} 
            justifyContent="center"
            alignItems="center"
          >
            {/* Admin/Player Actions - For Admins, SuperAdmins, and match creators */}  
            {canManageMatch && (
              <Stack 
                direction={isMobile ? "column" : "row"} 
                spacing={2}
              >
                {match.status === 'upcoming' && (
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => navigate(`/matches/${matchId}/live`)}
                    sx={{ 
                      minWidth: isMobile ? '100%' : '180px',
                      py: 2,
                      fontSize: '1rem',
                      background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #388E3C 30%, #689F38 90%)',
                      }
                    }}
                  >
                    Start Match
                  </Button>
                )}
                
                {match.status === 'in-progress' && (
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    startIcon={<PlayCircleIcon />}
                    onClick={() => navigate(`/matches/${matchId}/live`)}
                    sx={{ 
                      minWidth: isMobile ? '100%' : '180px',
                      py: 2,
                      fontSize: '1rem',
                      background: 'linear-gradient(45deg, #FF9800 30%, #FFB74D 90%)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #F57C00 30%, #FFA726 90%)',
                      }
                    }}
                  >
                    Continue Match
                  </Button>
                )}
              </Stack>
            )}

            {/* View Options - Always Available */}
            <Stack 
              direction={isMobile ? "column" : "row"} 
              spacing={2}
              sx={{ 
                borderLeft: !isMobile && (isAdmin || isSuperAdmin) ? '2px solid rgba(255,255,255,0.3)' : 'none',
                borderTop: isMobile && (isAdmin || isSuperAdmin) ? '2px solid rgba(255,255,255,0.3)' : 'none',
                pl: !isMobile && (isAdmin || isSuperAdmin) ? 3 : 0,
                pt: isMobile && (isAdmin || isSuperAdmin) ? 3 : 0,
                ml: !isMobile && (isAdmin || isSuperAdmin) ? 3 : 0,
                mt: isMobile && (isAdmin || isSuperAdmin) ? 3 : 0
              }}
            >
              <Button
                variant="outlined"
                size="large"
                startIcon={<CommentIcon />}
                onClick={() => navigate(`/matches/${matchId}/commentary`)}
                sx={{ 
                  minWidth: isMobile ? '100%' : '180px',
                  py: 2,
                  fontSize: '1rem',
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.5)',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  }
                }}
              >
                Live Commentary
              </Button>
              
              <Button
                variant="outlined"
                size="large"
                startIcon={<SummarizeIcon />}
                onClick={() => navigate(`/matches/${matchId}/summary`)}
                sx={{ 
                  minWidth: isMobile ? '100%' : '180px',
                  py: 2,
                  fontSize: '1rem',
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.5)',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  }
                }}
              >
                View Summary
              </Button>
            </Stack>
          </Stack>
          
        </Box>
      </Paper>
    </Box>
  );
};

export default MatchOverview;