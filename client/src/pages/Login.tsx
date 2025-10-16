import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = () => {
    if (username === 'superadmin' && password === 'superadmin123') {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userRole', 'superadmin');
      localStorage.setItem('username', 'superadmin');
      navigate('/');
    } else if (username === 'admin' && password === 'admin') {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userRole', 'admin');
      localStorage.setItem('username', 'admin');
      navigate('/');
    } else if (username === 'viewer' && password === 'viewer') {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userRole', 'viewer');
      localStorage.setItem('username', 'viewer');
      navigate('/');
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mt: 8,
        }}
      >
        <Paper sx={{ p: 4, width: '100%' }}>
          <Typography variant="h5" gutterBottom textAlign="center">
            Street Cricket Login
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Username"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 3 }}
            onClick={handleLogin}
          >
            Login
          </Button>

          <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary" textAlign="center">
            SuperAdmin: username: superadmin, password: superadmin123<br />
            Admin: username: admin, password: admin<br />
            Viewer: username: viewer, password: viewer
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;