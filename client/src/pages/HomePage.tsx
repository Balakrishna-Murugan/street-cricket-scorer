import React from 'react';
import { Typography, Paper, Container, Stack, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import ScoreboardIcon from '@mui/icons-material/Scoreboard';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Welcome to Street Cricket Scorecard
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Track your street cricket matches with ease
      </Typography>

      <Stack direction="row" spacing={3} sx={{ mt: 2 }} useFlexGap flexWrap="wrap">
        <Box width={{ xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' }}>
          <Paper
            onClick={() => navigate('/teams')}
            sx={{
              p: 3,
              textAlign: 'center',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.02)',
                boxShadow: 3
              }
            }}
          >
            <GroupsIcon sx={{ fontSize: 40, mb: 2, color: 'primary.main' }} />
            <Typography variant="h6">Teams</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your cricket teams
            </Typography>
          </Paper>
        </Box>

        <Box width={{ xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' }}>
          <Paper
            onClick={() => navigate('/players')}
            sx={{
              p: 3,
              textAlign: 'center',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.02)',
                boxShadow: 3
              }
            }}
          >
            <PersonIcon sx={{ fontSize: 40, mb: 2, color: 'primary.main' }} />
            <Typography variant="h6">Players</Typography>
            <Typography variant="body2" color="text.secondary">
              Track player profiles and stats
            </Typography>
          </Paper>
        </Box>

        <Box width={{ xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' }}>
          <Paper
            onClick={() => navigate('/matches')}
            sx={{
              p: 3,
              textAlign: 'center',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.02)',
                boxShadow: 3
              }
            }}
          >
            <SportsCricketIcon sx={{ fontSize: 40, mb: 2, color: 'primary.main' }} />
            <Typography variant="h6">Matches</Typography>
            <Typography variant="body2" color="text.secondary">
              View match history and results
            </Typography>
          </Paper>
        </Box>

        <Box width={{ xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' }}>
          <Paper
            onClick={() => navigate('/live-scoring')}
            sx={{
              p: 3,
              textAlign: 'center',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.02)',
                boxShadow: 3
              }
            }}
          >
            <ScoreboardIcon sx={{ fontSize: 40, mb: 2, color: 'primary.main' }} />
            <Typography variant="h6">Live Scoring</Typography>
            <Typography variant="body2" color="text.secondary">
              Track live match scores
            </Typography>
          </Paper>
        </Box>
      </Stack>
    </Container>
  );
};

export default HomePage;