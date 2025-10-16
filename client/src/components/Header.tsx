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
    const breadcrumbNameMap: { [key: string]: string } = {
      '/': 'Home',
      '/teams': 'Teams',
      '/players': 'Players', 
      '/matches': 'Matches',
      '/match-summary': 'Match Summary',
      '/overview': 'Match Overview',
      '/live': 'Live Scoring',
      '/summary': 'Match Summary',
      '/commentary': 'Live Commentary'
    };

    if (pathnames.length === 0) {
      return [{ label: 'Home', path: '/' }];
    }

    const breadcrumbs = [{ label: 'Home', path: '/' }];
    
    // Special handling for match-related pages - check navigation source
    if (pathnames[0] === 'matches' && pathnames[2] && (pathnames[2] === 'overview' || pathnames[2] === 'summary' || pathnames[2] === 'commentary')) {
      const navigationSource = sessionStorage.getItem('matchNavigationSource');
      
      if (navigationSource === 'match-summary') {
        // User came from Match Summary
        breadcrumbs.push({ label: 'Match Summary', path: '/match-summary' });
      } else {
        // User came from admin Matches or default
        breadcrumbs.push({ label: 'Matches', path: '/matches' });
      }
      
      // Add the match name (team vs team) 
      const matchId = pathnames[1];
      const matchLabel = matchInfo[matchId] || 'Match Details';
      breadcrumbs.push({ label: matchLabel, path: `/matches/${matchId}/overview` });
      
      // Add the final page if not overview
      if (pathnames[2] !== 'overview') {
        const finalLabel = breadcrumbNameMap[`/${pathnames[2]}`] || pathnames[2];
        breadcrumbs.push({ label: finalLabel, path: location.pathname });
      }
    } else {
      // Regular breadcrumb generation for other pages
      pathnames.forEach((pathname, index) => {
        const path = `/${pathnames.slice(0, index + 1).join('/')}`;
        let label = breadcrumbNameMap[`/${pathname}`] || pathname;
        
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
      <AppBar position="static" sx={{ 
        background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
        boxShadow: '0 3px 5px 2px rgba(25, 118, 210, .3)',
      }}>
        <Toolbar>
          {/* Mobile Menu Button - Only show on mobile */}
          {isMobile && (
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
          )}

          <IconButton color="inherit" onClick={() => navigate('/')} sx={{ mr: 1 }}>
            <HomeIcon />
          </IconButton>

          <Typography 
            variant={isMobile ? "h6" : "h5"} 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            {isMobile ? 'Cricket' : 'Street Cricket'} {!isAdmin && !isSuperAdmin && !isMobile && '(Viewer Mode)'}
          </Typography>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
              {(isAdmin || isSuperAdmin) && (
                <>
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
                </>
              )}
              <Button 
                color="inherit" 
                startIcon={<ScoreboardIcon />}
                onClick={() => navigate('/match-summary')}
                sx={{ 
                  minWidth: '120px',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                Match Summary
              </Button>
            </Box>
          )}

          {/* User Profile Section */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {!isMobile && (
              <Typography variant="body2" sx={{ mr: 1, fontWeight: 500 }}>
                {username} ({userRole})
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
            background: 'linear-gradient(180deg, #f5f5f5 0%, #e3f2fd 100%)',
          },
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 2,
          bgcolor: 'primary.main',
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
          <ListItem sx={{ bgcolor: 'rgba(25, 118, 210, 0.1)', py: 2 }}>
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
              primaryTypographyProps={{ fontWeight: 'bold' }}
            />
          </ListItem>
          
          <Divider />
          
          {/* Navigation Items */}
          <ListItemButton onClick={() => { navigate('/'); handleDrawerClose(); }}>
            <ListItemIcon><HomeIcon color="primary" /></ListItemIcon>
            <ListItemText primary="Home" />
          </ListItemButton>
          
          {(isAdmin || isSuperAdmin) && (
            <>
              <ListItemButton onClick={() => { navigate('/teams'); handleDrawerClose(); }}>
                <ListItemIcon><GroupsIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Teams" />
              </ListItemButton>
              
              <ListItemButton onClick={() => { navigate('/players'); handleDrawerClose(); }}>
                <ListItemIcon><PeopleIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Players" />
              </ListItemButton>
              
              <ListItemButton onClick={() => { navigate('/matches'); handleDrawerClose(); }}>
                <ListItemIcon><SportsBaseballIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Matches" />
              </ListItemButton>
              
              <Divider />
            </>
          )}
          
          <ListItemButton onClick={() => { navigate('/match-summary'); handleDrawerClose(); }}>
            <ListItemIcon><ScoreboardIcon color="primary" /></ListItemIcon>
            <ListItemText primary="Match Summary" />
          </ListItemButton>
          
          <Divider />
          
          <ListItemButton onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon><LogoutIcon color="error" /></ListItemIcon>
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
              {username} ({userRole})
            </Typography>
          </MenuItem>
        )}
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 1 }} /> Logout
        </MenuItem>
      </Menu>

      {/* Breadcrumbs Bar - Hide on mobile for LiveScoring page */}
      {!(isMobile && location.pathname.includes('/live')) && (
        <Box sx={{ 
          bgcolor: 'grey.50', 
          py: isMobile ? 0.5 : 1, 
          px: 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          minHeight: isMobile ? '32px' : '40px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Breadcrumbs 
            separator={<NavigateNextIcon fontSize="small" />}
            aria-label="breadcrumb"
            sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
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