import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
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
          Street Cricket
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton color="inherit" onClick={handleProfileClick}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
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
          <MenuItem onClick={() => { navigate('/teams'); handleMenuClose(); }}>
            Teams
          </MenuItem>
          <MenuItem onClick={() => { navigate('/players'); handleMenuClose(); }}>
            Players
          </MenuItem>
          <MenuItem onClick={() => { navigate('/matches'); handleMenuClose(); }}>
            Matches
          </MenuItem>
          <MenuItem onClick={() => { navigate('/live-scoring'); handleMenuClose(); }}>
            Live Scoring
          </MenuItem>
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