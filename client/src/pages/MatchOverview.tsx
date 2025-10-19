import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Container,
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
  const isAdmin = userRole === 'admin';
  const isSuperAdmin = userRole === 'superadmin';

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
      <Container>
        <Typography>Loading match details...</Typography>
      </Container>
    );
  }

  if (error || !match) {
    return (
      <Container>
        <Typography color="error">{error || 'Match not found'}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
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
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Choose what you want to do:
          </Typography>
          
          <Stack 
            direction={isMobile ? "column" : "row"} 
            spacing={2} 
            justifyContent="center"
            alignItems="center"
          >
            {/* View Options - Always Available */}
            <Stack 
              direction={isMobile ? "column" : "row"} 
              spacing={2}
            >
              <Button
                variant="contained"
                size="large"
                startIcon={<SummarizeIcon />}
                onClick={() => navigate(`/matches/${matchId}/summary`)}
                sx={{ 
                  minWidth: isMobile ? '100%' : '180px',
                  py: 2,
                  fontSize: '1rem'
                }}
              >
                View Summary
              </Button>
              
              <Button
                variant="outlined"
                size="large"
                startIcon={<CommentIcon />}
                onClick={() => navigate(`/matches/${matchId}/commentary`)}
                sx={{ 
                  minWidth: isMobile ? '100%' : '180px',
                  py: 2,
                  fontSize: '1rem'
                }}
              >
                Live Commentary
              </Button>
            </Stack>

            {/* Admin Actions - Only for Admins and SuperAdmins */}
            {(isAdmin || isSuperAdmin) && (
              <Stack 
                direction={isMobile ? "column" : "row"} 
                spacing={2}
                sx={{ 
                  borderLeft: !isMobile ? '2px solid #e0e0e0' : 'none',
                  borderTop: isMobile ? '2px solid #e0e0e0' : 'none',
                  pl: !isMobile ? 3 : 0,
                  pt: isMobile ? 3 : 0,
                  ml: !isMobile ? 3 : 0,
                  mt: isMobile ? 3 : 0
                }}
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
                      fontSize: '1rem'
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
                      fontSize: '1rem'
                    }}
                  >
                    Continue Match
                  </Button>
                )}
              </Stack>
            )}
          </Stack>
          
          <Typography variant="body2" color="textSecondary" sx={{ mt: 3 }}>
            {(isAdmin || isSuperAdmin) 
              ? "View match details, commentary, or manage the match"
              : "View detailed statistics and scores, or watch the ball-by-ball commentary"
            }
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default MatchOverview;