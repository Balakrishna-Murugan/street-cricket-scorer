import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Button, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { teamService, playerService, matchService } from '../services/api.service';

const HomePageNewBackup: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ teams: 0, players: 0, matches: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setLoading(true);
        const [t, p, m] = await Promise.all([
          teamService.getAll(),
          playerService.getAll(),
          matchService.getAll()
        ]);

        setCounts({ teams: t.data.length || 0, players: p.data.length || 0, matches: m.data.length || 0 });
      } catch (err) {
        console.error('HomePage: failed to fetch counts', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>Welcome to Cricket Scorecard</Typography>
        <Typography variant="body1" color="text.secondary">Quick overview and actions to get you scoring fast.</Typography>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6">Teams</Typography>
          {loading ? <CircularProgress size={20} /> : <Typography variant="h4">{counts.teams}</Typography>}
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/teams')}>Manage Teams</Button>
        </Paper>

        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6">Players</Typography>
          {loading ? <CircularProgress size={20} /> : <Typography variant="h4">{counts.players}</Typography>}
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/players')}>Manage Players</Button>
        </Paper>

        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6">Matches</Typography>
          {loading ? <CircularProgress size={20} /> : <Typography variant="h4">{counts.matches}</Typography>}
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/matches')}>View Matches</Button>
        </Paper>

        <Box sx={{ gridColumn: '1 / -1' }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Interactive Playground</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Try creating a player or team using the top navigation. Use 'Create & Continue' for fast bulk adds. SuperAdmins can delete multiple matches from Matches screen.</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button variant="outlined" onClick={() => navigate('/matches')}>View Live Matches</Button>
              <Button variant="outlined" onClick={() => navigate('/matches/new')}>Create Match</Button>
              <Button variant="contained" color="secondary" onClick={() => window.open('https://www.cricbuzz.com/cricket-match/live-scores', '_blank')}>Cricbuzz Live Scores</Button>
              <Button variant="contained" onClick={() => window.open('https://www.espncricinfo.com/', '_blank')}>Cricinfo</Button>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default HomePageNewBackup;
