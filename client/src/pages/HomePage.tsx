import React from 'react';
import { Typography, Paper, Container, Stack, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  
  // Get user role for conditional rendering
  const userRole = localStorage.getItem('userRole') || 'viewer';
  const isAdmin = userRole === 'admin';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        padding: 3,
      }}
    >
      <Container maxWidth="lg">
        <Paper
          elevation={8}
          sx={{
            padding: 4,
            borderRadius: 3,
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}
        >
          <Typography 
            variant="h3" 
            gutterBottom
            sx={{ 
              fontWeight: 'bold',
              color: '#2c3e50',
              mb: 2,
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            🏏 Welcome to Street Cricket Scorecard
          </Typography>
          <Typography 
            variant="h6" 
            color="text.secondary" 
            paragraph
            sx={{ mb: 4, fontWeight: 500 }}
          >
            Track your street cricket matches with professional scoring and statistics
          </Typography>

          <Stack direction="row" spacing={3} sx={{ mt: 4 }} useFlexGap flexWrap="wrap">
            {isAdmin && (
              <>
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
                  transition: 'all 0.3s ease',
                  borderRadius: '12px',
                  background: 'linear-gradient(45deg, #e3f2fd 30%, #bbdefb 90%)',
                  border: '1px solid #2196F3',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 16px rgba(33, 150, 243, 0.3)'
                  }
                }}
              >
                <GroupsIcon sx={{ fontSize: 50, mb: 2, color: '#1565c0' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Teams</Typography>
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
                  transition: 'all 0.3s ease',
                  borderRadius: '12px',
                  background: 'linear-gradient(45deg, #e8f5e8 30%, #c8e6c9 90%)',
                  border: '1px solid #4CAF50',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 16px rgba(76, 175, 80, 0.3)'
                  }
                }}
              >
                <PersonIcon sx={{ fontSize: 50, mb: 2, color: '#2e7d32' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Players</Typography>
                <Typography variant="body2" color="text.secondary">
                  Track player profiles and stats
                </Typography>
              </Paper>
            </Box>
              </>
            )}

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
                  transition: 'all 0.3s ease',
                  borderRadius: '12px',
                  background: 'linear-gradient(45deg, #fff3e0 30%, #ffcc02 90%)',
                  border: '1px solid #FF9800',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 16px rgba(255, 152, 0, 0.3)'
                  }
                }}
              >
                <SportsCricketIcon sx={{ fontSize: 50, mb: 2, color: '#f57c00' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                  {isAdmin ? 'Manage Matches' : 'View Matches'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isAdmin ? 'Create and manage cricket matches' : 'View match summaries and results'}
                </Typography>
              </Paper>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default HomePage;