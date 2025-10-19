import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Container,
  Button,
  useTheme,
  useMediaQuery,
  Chip,
  Stack
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { Match, Team } from '../types';
import { matchService, teamService } from '../services/api.service';
import MatchCommentary from '../components/MatchCommentary';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SummarizeIcon from '@mui/icons-material/Summarize';

const MatchCommentaryPage: React.FC = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [match, setMatch] = useState<Match | null>(null);
  const [teams, setTeams] = useState<{ [key: string]: Team }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch match details
        const matchResponse = await matchService.getById(matchId!);
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
        setError('Failed to load match data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  if (loading) {
    return (
      <Container>
        <Typography>Loading commentary...</Typography>
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
      {/* Header with Navigation */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: isMobile ? 2 : 3, 
          mb: 3, 
          background: 'linear-gradient(135deg, #020e43 0%, #764ba2 100%)', 
          color: 'white',
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(2, 14, 67, 0.3)'
        }}
      >
        <Stack 
          direction={isMobile ? "column" : "row"} 
          justifyContent="space-between" 
          alignItems={isMobile ? "stretch" : "center"} 
          spacing={isMobile ? 1 : 0}
          sx={{ mb: 2 }}
        >
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/matches/${matchId}/overview`)}
            sx={{ 
              color: 'white', 
              borderColor: 'rgba(255, 255, 255, 0.5)',
              fontSize: isMobile ? '0.8rem' : '0.875rem',
              py: isMobile ? 0.75 : 1,
              borderRadius: '8px',
              '&:hover': { 
                borderColor: 'white', 
                backgroundColor: 'rgba(255,255,255,0.15)',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(255,255,255,0.2)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            {isMobile ? 'Back' : 'Back to Overview'}
          </Button>
          
          <Button
            variant="contained"
            startIcon={<SummarizeIcon />}
            onClick={() => navigate(`/matches/${matchId}/summary`)}
            sx={{ 
              backgroundColor: 'white',
              color: '#020e43',
              fontSize: isMobile ? '0.8rem' : '0.875rem',
              py: isMobile ? 0.75 : 1,
              borderRadius: '8px',
              fontWeight: 'bold',
              '&:hover': { 
                backgroundColor: 'rgba(255,255,255,0.95)',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(255,255,255,0.3)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            {isMobile ? 'Summary' : 'View Summary'}
          </Button>
        </Stack>
        
        <Box sx={{ textAlign: 'center' }}>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            component="h1" 
            gutterBottom 
            sx={{ 
              fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            {getTeamName(match.team1)} vs {getTeamName(match.team2)}
          </Typography>
          
          <Stack 
            direction="row" 
            spacing={2} 
            justifyContent="center" 
            alignItems="center"
            flexWrap="wrap"
          >
            <Chip 
              label={getStatusLabel(match.status)} 
              color={getStatusColor(match.status) as any}
              sx={{ 
                backgroundColor: 'white',
                color: match.status === 'in-progress' ? '#ff9800' : '#020e43',
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            />
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 'medium',
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
              }}
            >
              📺 Live Commentary
            </Typography>
          </Stack>
        </Box>
      </Paper>

      {/* Commentary Content */}
      <Box>
        <MatchCommentary match={match} />
      </Box>
    </Container>
  );
};

export default MatchCommentaryPage;