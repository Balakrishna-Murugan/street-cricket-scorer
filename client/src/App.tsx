import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme, Box } from '@mui/material';
import HomePage from './pages/HomePage';
import TeamList from './pages/TeamList';
import PlayerList from './pages/PlayerList';
import MatchList from './pages/MatchList';
import LiveScoring from './pages/LiveScoring';
import MatchSummary from './pages/MatchSummary';
import Login from './pages/Login';
import Header from './components/Header';
import AuthGuard from './components/AuthGuard';
import AdminGuard from './components/AdminGuard';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: '44px', // Minimum touch target size
          '@media (max-width:600px)': {
            minHeight: '48px', // Larger touch targets on mobile
            fontSize: '1rem',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: '44px',
          minHeight: '44px',
          '@media (max-width:600px)': {
            minWidth: '48px',
            minHeight: '48px',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            padding: '8px 4px',
            fontSize: '0.75rem',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            minHeight: '28px',
            fontSize: '0.75rem',
          },
        },
      },
    },
  },
  typography: {
    h3: {
      '@media (max-width:600px)': {
        fontSize: '1.8rem',
      },
    },
    h4: {
      '@media (max-width:600px)': {
        fontSize: '1.5rem',
      },
    },
    h5: {
      '@media (max-width:600px)': {
        fontSize: '1.25rem',
      },
    },
    h6: {
      '@media (max-width:600px)': {
        fontSize: '1.1rem',
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="*"
            element={
              <AuthGuard>
                <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                  <Header />
                  <Box sx={{ 
                    p: { xs: 1, sm: 1.5, md: 2 }, 
                    flexGrow: 1,
                    maxWidth: '100vw',
                    overflow: 'hidden'
                  }}>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/teams" element={<AdminGuard><TeamList /></AdminGuard>} />
                      <Route path="/players" element={<AdminGuard><PlayerList /></AdminGuard>} />
                      <Route path="/matches" element={<MatchList />} />
                      <Route path="/matches/:matchId/live" element={<AdminGuard><LiveScoring /></AdminGuard>} />
                      <Route path="/matches/:matchId/summary" element={<MatchSummary />} />
                    </Routes>
                  </Box>
                </Box>
              </AuthGuard>
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
