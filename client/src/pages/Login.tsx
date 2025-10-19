import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
  InputAdornment,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

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

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #020e43 0%, #764ba2 100%)',
        py: 3,
      }}
    >
      <Container maxWidth="sm">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Logo/Brand Section */}
          <Box
            sx={{
              mb: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Box
              component="img"
              src={require('../Image/TNCC.png')}
              alt="Cricket Logo"
              sx={{
                height: isMobile ? 80 : 100,
                width: isMobile ? 80 : 100,
                borderRadius: '50%',
                objectFit: 'cover',
                mb: 2,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                border: '4px solid white',
              }}
            />
            <Typography
              variant={isMobile ? "h4" : "h3"}
              sx={{
                color: 'white',
                fontWeight: 'bold',
                textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
                textAlign: 'center',
              }}
            >
              Street Cricket
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                color: 'rgba(255,255,255,0.9)',
                mt: 0.5,
                textAlign: 'center',
              }}
            >
              Scorer Application
            </Typography>
          </Box>

          {/* Login Form */}
          <Paper
            elevation={10}
            sx={{
              p: isMobile ? 3 : 4,
              width: '100%',
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Typography
              variant="h5"
              gutterBottom
              textAlign="center"
              sx={{
                fontWeight: 600,
                color: theme.palette.primary.main,
                mb: 3,
              }}
            >
              Welcome Back
            </Typography>

            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 2,
                  borderRadius: 2,
                }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}

            <TextField
              label="Username"
              fullWidth
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              autoComplete="username"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                },
              }}
            />

            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                },
              }}
            />

            <Button
              variant="contained"
              fullWidth
              size="large"
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1.1rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #020e43 0%, #764ba2 100%)',
                boxShadow: '0 4px 12px rgba(2, 14, 67, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #020e43 100%)',
                  boxShadow: '0 6px 16px rgba(118, 75, 162, 0.6)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
              }}
              onClick={handleLogin}
            >
              Sign In
            </Button>

            <Typography
              variant="body2"
              sx={{
                mt: 2,
                textAlign: 'center',
                color: 'text.secondary',
              }}
            >
              Secure access for authorized users only
            </Typography>
          </Paper>

          {/* Footer */}
          <Typography
            variant="body2"
            sx={{
              mt: 3,
              color: 'rgba(255,255,255,0.8)',
              textAlign: 'center',
            }}
          >
            © {new Date().getFullYear()} Street Cricket Scorer. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;