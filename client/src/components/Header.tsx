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
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
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
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [matchInfo, setMatchInfo] = useState<{ [key: string]: string }>({});
  
  // Get user role and username from localStorage
  const userRole = localStorage.getItem('userRole') || 'viewer';
  const username = localStorage.getItem('username') || 'User';
  const isAdmin = userRole === 'admin';
  const isSuperAdmin = userRole === 'superadmin';

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
    const pathSegmentNames: { [key: string]: string } = {
      '/': 'Home',
      '/teams': 'Teams',
      '/players': 'Players', 
      '/matches': 'Matches',
      '/overview': 'Match Overview',
      '/live': 'Live Scoring',
      '/summary': 'Match Summary',
      '/commentary': 'Live Commentary'
    };

    if (pathnames.length === 0) {
      return [{ label: 'Home', path: '/' }];
    }

    const breadcrumbs = [{ label: 'Home', path: '/' }];
    
    // Special handling for match-related pages
    if (pathnames[0] === 'matches' && pathnames[2] && (pathnames[2] === 'overview' || pathnames[2] === 'summary' || pathnames[2] === 'commentary')) {
      // Always go to Matches 
      breadcrumbs.push({ label: 'Matches', path: '/matches' });
      
      // Add the match name (team vs team) 
      const matchId = pathnames[1];
      const matchLabel = matchInfo[matchId] || 'Match Details';
      breadcrumbs.push({ label: matchLabel, path: `/matches/${matchId}/overview` });
      
      // Add the final page if not overview
      if (pathnames[2] !== 'overview') {
        const finalLabel = pathSegmentNames[`/${pathnames[2]}`] || pathnames[2];
        breadcrumbs.push({ label: finalLabel, path: location.pathname });
      }
    } else {
      // Regular breadcrumb generation for other pages
      pathnames.forEach((pathname, index) => {
        const path = `/${pathnames.slice(0, index + 1).join('/')}`;
        let label = pathSegmentNames[`/${pathname}`] || pathname;
        
        // Special handling for match IDs - show team names if available, otherwise "Match Details"
        if (pathnames[index - 1] === 'matches' && pathname.length > 10) {
          label = matchInfo[pathname] || 'Match Details';
        }
        
        breadcrumbs.push({ label, path });
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  const handleMenuClick = () => {
    setMobileDrawerOpen(true);
  };

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleDrawerClose = () => {
    setMobileDrawerOpen(false);
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
      <AppBar position="fixed" sx={{ 
        background: 'linear-gradient(135deg, #020e43 0%, #764ba2 100%)',
        boxShadow: '0 3px 5px 2px rgba(2, 14, 67, .3)',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}>
        <Toolbar>
          {/* Logo - Left corner, circular */}
          <Box
            component="img"
            src={require('../Image/TNCC.png')}
            alt="Cricket Logo"
            onClick={() => navigate('/')}
            sx={{
              height: isMobile ? 40 : 50,
              width: isMobile ? 40 : 50,
              borderRadius: '50%',
              objectFit: 'cover',
              cursor: 'pointer',
              mr: isMobile ? 1 : 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.1)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }
            }}
          />

          {/* Mobile Menu Button - Only show on mobile */}
          {isMobile && (
            <IconButton
              size="large"
              color="inherit"
              aria-label="menu"
              sx={{ mr: 2 }}
              onClick={handleMenuClick}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography 
            variant={isMobile ? "h6" : "h5"} 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMobile ? 'center' : 'flex-start'
            }}
          >
            {isMobile ? 'Cricket' : 'Cricket'} {!isAdmin && !isSuperAdmin && !isMobile && '(Viewer Mode)'}
          </Typography>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
              <Button 
                color="inherit" 
                startIcon={<GroupsIcon />}
                onClick={() => navigate('/teams')}
                sx={{ 
                  minWidth: '100px',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                Teams
              </Button>
              <Button 
                color="inherit" 
                startIcon={<PeopleIcon />}
                onClick={() => navigate('/players')}
                sx={{ 
                  minWidth: '100px',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                Players
              </Button>
              <Button 
                color="inherit" 
                startIcon={<SportsBaseballIcon />}
                onClick={() => navigate('/matches')}
                sx={{ 
                  minWidth: '100px',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                Matches
              </Button>
            </Box>
          )}

          {/* User Profile Section */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {!isMobile && (
              <Typography variant="body2" sx={{ mr: 1, fontWeight: 500 }}>
                {username}
              </Typography>
            )}
            <IconButton color="inherit" onClick={handleProfileClick}>
              <Avatar sx={{ 
                width: 36, 
                height: 36, 
                bgcolor: isSuperAdmin ? 'error.main' : (isAdmin ? 'secondary.main' : 'warning.main'),
                border: '2px solid rgba(255,255,255,0.3)' 
              }}>
                <AccountCircleIcon />
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer Navigation */}
      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={handleDrawerClose}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            background: 'linear-gradient(180deg, #020e43 0%, #764ba2 100%)',
          },
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 2,
          bgcolor: 'rgba(0, 0, 0, 0.2)',
          color: 'white'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Menu
          </Typography>
          <IconButton 
            color="inherit" 
            onClick={handleDrawerClose}
            sx={{ p: 1 }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        
        <List sx={{ pt: 0 }}>
          {/* User Info */}
          <ListItem sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', py: 2 }}>
            <ListItemIcon>
              <Avatar sx={{ 
                bgcolor: isSuperAdmin ? 'error.main' : (isAdmin ? 'secondary.main' : 'warning.main'),
                width: 40,
                height: 40 
              }}>
                <AccountCircleIcon />
              </Avatar>
            </ListItemIcon>
            <ListItemText 
              primary={username}
              secondary={`${userRole}${!isAdmin && !isSuperAdmin ? ' (View Only)' : ''}`}
              primaryTypographyProps={{ fontWeight: 'bold', color: 'white' }}
              secondaryTypographyProps={{ color: 'rgba(255, 255, 255, 0.7)' }}
            />
          </ListItem>
          
          <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }} />
          
          {/* Navigation Items */}
          <ListItemButton 
            onClick={() => { navigate('/'); handleDrawerClose(); }}
            sx={{ 
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
            }}
          >
            <ListItemIcon><HomeIcon sx={{ color: 'white' }} /></ListItemIcon>
            <ListItemText primary="Home" />
          </ListItemButton>
          
          <ListItemButton 
            onClick={() => { navigate('/teams'); handleDrawerClose(); }}
            sx={{ 
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
            }}
          >
            <ListItemIcon><GroupsIcon sx={{ color: 'white' }} /></ListItemIcon>
            <ListItemText primary="Teams" />
          </ListItemButton>
          
          <ListItemButton 
            onClick={() => { navigate('/players'); handleDrawerClose(); }}
            sx={{ 
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
            }}
          >
            <ListItemIcon><PeopleIcon sx={{ color: 'white' }} /></ListItemIcon>
            <ListItemText primary="Players" />
          </ListItemButton>
          
          <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }} />
          
          <ListItemButton 
            onClick={() => { navigate('/matches'); handleDrawerClose(); }}
            sx={{ 
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
            }}
          >
            <ListItemIcon><ScoreboardIcon sx={{ color: 'white' }} /></ListItemIcon>
            <ListItemText primary="Matches" />
          </ListItemButton>
          
          <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }} />
          
          <ListItemButton 
            onClick={handleLogout} 
            sx={{ 
              color: '#ff6b6b',
              '&:hover': { bgcolor: 'rgba(255, 107, 107, 0.1)' }
            }}
          >
            <ListItemIcon><LogoutIcon sx={{ color: '#ff6b6b' }} /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </List>
      </Drawer>



      {/* Profile Menu */}
      <Menu
        anchorEl={profileAnchorEl}
        open={Boolean(profileAnchorEl)}
        onClose={handleProfileClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {isMobile && (
          <MenuItem disabled>
            <Typography variant="body2" color="textSecondary">
              {username}
            </Typography>
          </MenuItem>
        )}
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 1 }} /> Logout
        </MenuItem>
      </Menu>

      {/* Breadcrumbs Bar - Hide on mobile */}
      {!isMobile && (
        <Box sx={{ 
          bgcolor: 'grey.50', 
          py: 1, 
          px: 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          minHeight: '40px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Breadcrumbs 
            separator={<NavigateNextIcon fontSize="small" />}
            aria-label="breadcrumb"
            sx={{ fontSize: '0.875rem' }}
          >
            {breadcrumbs.map((crumb, index) => (
              index === breadcrumbs.length - 1 ? (
                <Typography 
                  key={crumb.path} 
                  color="text.primary" 
                  fontSize="inherit"
                  sx={{ fontWeight: 500 }}
                >
                  {isMobile && crumb.label.length > 15 
                    ? `${crumb.label.substring(0, 15)}...` 
                    : crumb.label
                  }
                </Typography>
              ) : (
                <Link
                  key={crumb.path}
                  color="inherit"
                  onClick={() => {
                    console.log('Breadcrumb clicked - navigating to:', crumb.path);
                    navigate(crumb.path);
                  }}
                  sx={{ 
                    cursor: 'pointer',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                  fontSize="inherit"
                >
                  {isMobile && crumb.label.length > 12 
                    ? `${crumb.label.substring(0, 12)}...` 
                    : crumb.label
                  }
                </Link>
              )
            ))}
          </Breadcrumbs>
        </Box>
      )}
    </Box>
  );
};

export default Header;