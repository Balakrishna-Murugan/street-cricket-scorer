import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Avatar,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  
  // Get user role and username from localStorage
  const userRole = localStorage.getItem('userRole') || 'viewer';
  const username = localStorage.getItem('username') || 'User';
  const isAdmin = userRole === 'admin';

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClose = () => {
    setProfileAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    navigate('/login');
    handleProfileClose();
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <IconButton
          size="large"
          edge="start"
          color="inherit"
          aria-label="menu"
          sx={{ mr: 2 }}
          onClick={handleMenuClick}
        >
          <MenuIcon />
        </IconButton>

        <IconButton color="inherit" onClick={() => navigate('/')}>
          <HomeIcon />
        </IconButton>

        <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 1 }}>
          Street Cricket {!isAdmin && '(Viewer Mode)'}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Typography variant="body2" sx={{ mr: 1 }}>
            {username} ({userRole})
          </Typography>
          <IconButton color="inherit" onClick={handleProfileClick}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: isAdmin ? 'secondary.main' : 'warning.main' }}>
              <AccountCircleIcon />
            </Avatar>
          </IconButton>
        </Box>

        {/* Navigation Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          {isAdmin && (
            <>
              <MenuItem onClick={() => { navigate('/teams'); handleMenuClose(); }}>
                Teams
              </MenuItem>
              <MenuItem onClick={() => { navigate('/players'); handleMenuClose(); }}>
                Players
              </MenuItem>
              <MenuItem onClick={() => { navigate('/matches'); handleMenuClose(); }}>
                Matches
              </MenuItem>
            </>
          )}
          {!isAdmin && (
            <MenuItem onClick={() => { navigate('/matches'); handleMenuClose(); }}>
              View Matches
            </MenuItem>
          )}
        </Menu>

        {/* Profile Menu */}
        <Menu
          anchorEl={profileAnchorEl}
          open={Boolean(profileAnchorEl)}
          onClose={handleProfileClose}
        >
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;