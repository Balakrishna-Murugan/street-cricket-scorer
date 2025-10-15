import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Avatar,
  Breadcrumbs,
  Link,
  useTheme,
  useMediaQuery,
  Button,
  Divider,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { matchService } from '../services/api.service';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import GroupsIcon from '@mui/icons-material/Groups';
import PeopleIcon from '@mui/icons-material/People';
import SportsBaseballIcon from '@mui/icons-material/SportsBaseball';
import ScoreboardIcon from '@mui/icons-material/Scoreboard';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const [matchInfo, setMatchInfo] = useState<{ [key: string]: string }>({});
  
  // Get user role and username from localStorage
  const userRole = localStorage.getItem('userRole') || 'viewer';
  const username = localStorage.getItem('username') || 'User';
  const isAdmin = userRole === 'admin';

  // Fetch match info when on a match page
  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    if (pathSegments[1] === 'matches' && pathSegments[2] && pathSegments[2].length > 10) {
      const matchId = pathSegments[2];
      if (!matchInfo[matchId]) {
        matchService.getById(matchId)
          .then(response => {
            const match = response.data;
            const team1Name = typeof match.team1 === 'object' ? match.team1.name : match.team1;
            const team2Name = typeof match.team2 === 'object' ? match.team2.name : match.team2;
            setMatchInfo(prev => ({
              ...prev,
              [matchId]: `${team1Name} vs ${team2Name}`
            }));
          })
          .catch(() => {
            // If fetch fails, keep default "Match Details"
          });
      }
    }
  }, [location.pathname, matchInfo]);

  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter((x) => x);
    const breadcrumbNameMap: { [key: string]: string } = {
      '/': 'Home',
      '/teams': 'Teams',
      '/players': 'Players', 
      '/matches': 'Matches',
      '/live': 'Live Scoring',
      '/summary': 'Match Summary'
    };

    if (pathnames.length === 0) {
      return [{ label: 'Home', path: '/' }];
    }

    const breadcrumbs = [{ label: 'Home', path: '/' }];
    
    pathnames.forEach((pathname, index) => {
      const path = `/${pathnames.slice(0, index + 1).join('/')}`;
      let label = breadcrumbNameMap[`/${pathname}`] || pathname;
      
      // Special handling for match IDs - show team names if available, otherwise "Match Details"
      if (pathnames[index - 1] === 'matches' && pathname.length > 10) {
        label = matchInfo[pathname] || 'Match Details';
      }
      
      breadcrumbs.push({ label, path });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

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
    <Box>
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

          {/* Quick Actions for larger screens */}
          {!isMobile && isAdmin && (
            <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
              <Button 
                color="inherit" 
                startIcon={<GroupsIcon />}
                onClick={() => navigate('/teams')}
                size="small"
              >
                Teams
              </Button>
              <Button 
                color="inherit" 
                startIcon={<PeopleIcon />}
                onClick={() => navigate('/players')}
                size="small"
              >
                Players
              </Button>
              <Button 
                color="inherit" 
                startIcon={<SportsBaseballIcon />}
                onClick={() => navigate('/matches')}
                size="small"
              >
                Matches
              </Button>
            </Box>
          )}

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
                  <GroupsIcon sx={{ mr: 1 }} /> Teams
                </MenuItem>
                <MenuItem onClick={() => { navigate('/players'); handleMenuClose(); }}>
                  <PeopleIcon sx={{ mr: 1 }} /> Players
                </MenuItem>
                <MenuItem onClick={() => { navigate('/matches'); handleMenuClose(); }}>
                  <SportsBaseballIcon sx={{ mr: 1 }} /> Matches
                </MenuItem>
                <Divider />
              </>
            )}
            <MenuItem onClick={() => { navigate('/matches'); handleMenuClose(); }}>
              <ScoreboardIcon sx={{ mr: 1 }} /> View Matches
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

      {/* Breadcrumbs Bar */}
      <Box sx={{ 
        bgcolor: 'grey.100', 
        py: 1, 
        px: 2, 
        borderBottom: 1, 
        borderColor: 'divider' 
      }}>
        <Breadcrumbs 
          separator={<NavigateNextIcon fontSize="small" />}
          aria-label="breadcrumb"
          sx={{ fontSize: '0.875rem' }}
        >
          {breadcrumbs.map((crumb, index) => (
            index === breadcrumbs.length - 1 ? (
              <Typography key={crumb.path} color="text.primary" fontSize="inherit">
                {crumb.label}
              </Typography>
            ) : (
              <Link
                key={crumb.path}
                color="inherit"
                onClick={() => navigate(crumb.path)}
                sx={{ 
                  cursor: 'pointer',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
                fontSize="inherit"
              >
                {crumb.label}
              </Link>
            )
          ))}
        </Breadcrumbs>
      </Box>
    </Box>
  );
};

export default Header;