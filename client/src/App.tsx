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
                  <Box sx={{ p: 3, flexGrow: 1 }}>
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
