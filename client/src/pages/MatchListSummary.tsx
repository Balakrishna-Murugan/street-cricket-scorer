import React, { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Chip,
  Card,
  CardContent,
  Container,
  useTheme,
  useMediaQuery,
  Button
} from '@mui/material';
import { Match, Team, TeamRef } from '../types';
import { matchService, teamService } from '../services/api.service';
import { useNavigate } from 'react-router-dom';
import VisibilityIcon from '@mui/icons-material/Visibility';

const MatchListSummary: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
    fetchTeams();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await matchService.getAll();
      // Sort matches by date (newest first)
      const sortedMatches = response.data.sort((a: Match, b: Match) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setMatches(sortedMatches);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await teamService.getAll();
      setTeams(response.data);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  const getTeamName = (team: string | TeamRef): string => {
    if (typeof team === 'string') {
      // If team is a string ID, find the team by ID
      const foundTeam = teams.find(t => t._id === team);
      return foundTeam ? foundTeam.name : team;
    } else {
      // If team is already an object with name, return the name
      return team.name;
    }
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMatchResult = (match: Match) => {
    if (match.status !== 'completed') return '-';
    
    // Simple result display - you can enhance this based on your match data structure
    if (match.innings && match.innings.length > 0) {
      const team1Name = getTeamName(match.team1);
      const team2Name = getTeamName(match.team2);
      
      // Basic result logic - enhance as needed
      return `${team1Name} vs ${team2Name}`;
    }
    return 'Match Completed';
  };

  if (loading) {
    return (
      <Container>
        <Typography>Loading matches...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Match Summary
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" gutterBottom>
          View all matches and their results
        </Typography>
      </Box>

      {isMobile ? (
        // Mobile Card View
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {matches.map((match) => (
            <Card key={match._id} elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="h2" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
                    {getTeamName(match.team1)} vs {getTeamName(match.team2)}
                  </Typography>
                  <Chip 
                    label={getStatusLabel(match.status)} 
                    color={getStatusColor(match.status) as any}
                    size="small"
                  />
                </Box>
                
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  📅 {formatDate(match.date)}
                </Typography>
                
                {match.venue && (
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    📍 {match.venue}
                  </Typography>
                )}
                
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  🏏 {match.overs} Overs
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {getMatchResult(match)}
                  </Typography>
                  
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => {
                      // Store navigation source for breadcrumb tracking
                      sessionStorage.setItem('matchNavigationSource', 'match-summary');
                      navigate(`/matches/${match._id}/overview`);
                    }}
                  >
                    View
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        // Desktop Table View
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Teams</strong></TableCell>
                  <TableCell><strong>Date & Time</strong></TableCell>
                  <TableCell><strong>Venue</strong></TableCell>
                  <TableCell><strong>{isMobile ? 'O' : 'Overs'}</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Result</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {matches.map((match) => (
                  <TableRow key={match._id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {getTeamName(match.team1)} vs {getTeamName(match.team2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(match.date)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {match.venue || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {match.overs}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusLabel(match.status)} 
                        color={getStatusColor(match.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getMatchResult(match)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<VisibilityIcon />}
                        onClick={() => {
                          // Store navigation source for breadcrumb tracking
                          sessionStorage.setItem('matchNavigationSource', 'match-summary');
                          navigate(`/matches/${match._id}/overview`);
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {matches.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">
            No matches found
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Matches will appear here once they are created
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default MatchListSummary;