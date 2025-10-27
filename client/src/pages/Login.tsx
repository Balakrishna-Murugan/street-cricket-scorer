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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { authService, LoginRequest, RegisterRequest, GuestLoginRequest } from '../services/api.service';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Guest login state
  const [guestName, setGuestName] = useState('');
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  
  // Registration state for Google login
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Validate email format
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(null);
    return true;
  };

  // Validate password confirmation in real-time
  const validatePasswordConfirmation = (confirmPassword: string) => {
    if (confirmPassword && registerData.password !== confirmPassword) {
      setPasswordError('Passwords do not match');
    } else {
      setPasswordError(null);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Client: Attempting login with:', { username, password: '***' });
      const loginData: LoginRequest = { username, password };
      const response = await authService.login(loginData);
      console.log('Client: Login response received:', response.data);
      
      // Store user data in localStorage
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('userRole', response.data.user.userRole || 'player');
      localStorage.setItem('username', response.data.user.username || response.data.user.name);
      
      navigate('/');
    } catch (error: any) {
      console.error('Client: Login error:', error);
      console.error('Client: Error response:', error.response?.data);
      console.error('Client: Error status:', error.response?.status);
      setError(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle guest login
  const handleGuestLogin = async () => {
    if (!guestName.trim()) {
      setError('Please enter your name for guest login');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Client: Attempting guest login with name:', guestName);
      const guestData: GuestLoginRequest = { name: guestName.trim() };
      const response = await authService.guestLogin(guestData);
      console.log('Client: Guest login response received:', response.data);
      
      // Store user data in localStorage
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('userRole', response.data.user.userRole || 'viewer');
      localStorage.setItem('username', response.data.user.name);
      
      navigate('/');
    } catch (error: any) {
      console.error('Client: Guest login error:', error);
      console.error('Client: Guest error response:', error.response?.data);
      console.error('Client: Guest error status:', error.response?.status);
      setError(error.response?.data?.message || 'Guest login failed. Please try again.');
    } finally {
      setLoading(false);
      setShowGuestDialog(false);
      setGuestName('');
    }
  };

  // Handle user registration
  const handleRegister = async () => {
    // Validate all fields
    if (!registerData.name || !registerData.email || !registerData.username || !registerData.password) {
      setRegisterError('All fields are required');
      return;
    }

    // Validate email format
    if (!validateEmail(registerData.email)) {
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setRegisterError('Passwords do not match');
      return;
    }

    if (registerData.password.length < 6) {
      setRegisterError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setRegisterError(null);

    try {
      // Check if email already exists
      const emailCheckResponse = await authService.checkEmail(registerData.email);
      if (emailCheckResponse.data.exists) {
        setRegisterError('An account with this email already exists');
        return;
      }

      const registerRequest: RegisterRequest = {
        name: registerData.name,
        email: registerData.email,
        username: registerData.username,
        password: registerData.password,
        age: 25,
        role: 'batsman',
        userRole: 'player'
      };

      const response = await authService.register(registerRequest);
      
      // Store user data in localStorage
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('userRole', response.data.user.userRole || 'player');
      localStorage.setItem('username', response.data.user.username || response.data.user.name);
      
      navigate('/');
    } catch (error: any) {
      console.error('Registration error:', error);
      setRegisterError(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
      setShowRegisterDialog(false);
      setRegisterData({ name: '', email: '', username: '', password: '', confirmPassword: '' });
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
              Cricket
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
              p: isMobile ? 1 : 4,
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
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>

            {/* Divider */}
            <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
              <Divider sx={{ flex: 1 }} />
              <Typography variant="body2" sx={{ px: 2, color: 'text.secondary' }}>
                or
              </Typography>
              <Divider sx={{ flex: 1 }} />
            </Box>

            {/* Alternative Login Options */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                startIcon={<PersonAddIcon />}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 500,
                  borderColor: theme.palette.primary.main,
                  color: theme.palette.primary.main,
                  '&:hover': {
                    borderColor: theme.palette.primary.dark,
                    backgroundColor: theme.palette.primary.light + '10',
                  },
                }}
                onClick={() => setShowGuestDialog(true)}
                disabled={loading}
              >
                Continue as Guest
              </Button>
            </Box>

            {/* Registration Link */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Don't have an account?{' '}
                <Button
                  variant="text"
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: theme.palette.primary.main,
                    p: 0,
                    minWidth: 'auto',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      textDecoration: 'underline',
                    },
                  }}
                  onClick={() => setShowRegisterDialog(true)}
                  disabled={loading}
                >
                  Sign up here
                </Button>
              </Typography>
            </Box>
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
            © {new Date().getFullYear()} Cricket Scorer. All rights reserved.
          </Typography>
        </Box>
      </Container>

      {/* Guest Login Dialog */}
      <Dialog 
        open={showGuestDialog} 
        onClose={() => setShowGuestDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            background: 'white',
            color: 'black',
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #020e43 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: 'bold',
          borderRadius: '16px 16px 0 0'
        }}>
          Continue as Guest
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Your Name"
            fullWidth
            variant="outlined"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleGuestLogin()}
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={() => setShowGuestDialog(false)}
            sx={{
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1.1rem',
              fontWeight: 600,
              borderColor: theme.palette.primary.main,
              color: theme.palette.primary.main,
              '&:hover': {
                borderColor: theme.palette.primary.main,
                backgroundColor: 'rgba(2, 14, 67, 0.04)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 8px rgba(2, 14, 67, 0.2)',
              },
              transition: 'all 0.3s ease',
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleGuestLogin} 
            variant="contained" 
            disabled={loading}
            sx={{
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
          >
            {loading ? 'Creating Guest Account...' : 'Continue'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Registration Dialog for Google Login */}
      <Dialog 
        open={showRegisterDialog} 
        onClose={() => setShowRegisterDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            background: 'white',
            color: 'black',
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #020e43 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: 'bold',
          borderRadius: '16px 16px 0 0'
        }}>
          Complete Your Registration
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {registerError && (
            <Alert severity="error" sx={{ mb: 2, backgroundColor: 'rgba(255, 255, 255, 0.9)', color: '#d32f2f' }}>
              {registerError}
            </Alert>
          )}

          <TextField
            margin="dense"
            label="Full Name"
            fullWidth
            variant="outlined"
            value={registerData.name}
            onChange={(e) => setRegisterData(prev => ({ ...prev, name: e.target.value }))}
            sx={{
              mb: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
          />
          
          <TextField
            margin="dense"
            label="Email"
            fullWidth
            variant="outlined"
            value={registerData.email}
            onChange={(e) => {
              setRegisterData(prev => ({ ...prev, email: e.target.value }));
              validateEmail(e.target.value);
            }}
            error={!!emailError}
            helperText={emailError}
            sx={{
              mb: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
              '& .MuiFormHelperText-root': {
                color: '#f44336',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                margin: 0,
                padding: '4px 8px',
                borderRadius: '4px',
              }
            }}
          />
          
          <TextField
            margin="dense"
            label="Username"
            fullWidth
            variant="outlined"
            value={registerData.username}
            onChange={(e) => setRegisterData(prev => ({ ...prev, username: e.target.value }))}
            sx={{
              mb: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
          />
          
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={registerData.password}
            onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
            sx={{
              mb: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
          />
          
          <TextField
            margin="dense"
            label="Confirm Password"
            type="password"
            fullWidth
            variant="outlined"
            value={registerData.confirmPassword}
            onChange={(e) => {
              setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }));
              validatePasswordConfirmation(e.target.value);
            }}
            error={!!passwordError}
            helperText={passwordError}
            onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
              '& .MuiFormHelperText-root': {
                color: '#f44336',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                margin: 0,
                padding: '4px 8px',
                borderRadius: '4px',
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={() => setShowRegisterDialog(false)}
            sx={{
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1.1rem',
              fontWeight: 600,
              borderColor: theme.palette.primary.main,
              color: theme.palette.primary.main,
              '&:hover': {
                borderColor: theme.palette.primary.main,
                backgroundColor: 'rgba(2, 14, 67, 0.04)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 8px rgba(2, 14, 67, 0.2)',
              },
              transition: 'all 0.3s ease',
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRegister} 
            variant="contained" 
            disabled={loading}
            sx={{
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
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login;