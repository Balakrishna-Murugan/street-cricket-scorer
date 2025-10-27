import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Chip,
  Stack,
  Card,
  CardContent,
  CardActions,
  useTheme,
  useMediaQuery,
  Autocomplete,
  Alert,
  AlertTitle,
  Checkbox,
  Fab
} from '@mui/material';
import { Match, Team } from '../types';
import { matchService, teamService } from '../services/api.service';
import { useNavigate } from 'react-router-dom';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import AddIcon from '@mui/icons-material/Add';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import DeselectIcon from '@mui/icons-material/Deselect';

const defaultMatch: Omit<Match, '_id'> = {
  team1: '',
  team2: '',
  date: new Date().toISOString(),
  overs: 20,
  status: 'upcoming',
  venue: '',
  currentInnings: 0,
  matchSettings: {
    oversPerBowler: 4,
    maxPlayersPerTeam: 11
  },
  bowlerRotation: {
    bowlerOversCount: {},
    availableBowlers: []
  },
  innings: [{
    battingTeam: '',
    bowlingTeam: '',
    totalRuns: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    isCompleted: false,
    battingStats: [],
    bowlingStats: [],
    currentState: {
      currentOver: 0,
      currentBall: 0,
      lastBallRuns: 0
    },
    extras: {
      wides: 0,
      noBalls: 0,
      byes: 0,
      legByes: 0,
      total: 0
    },
    runRate: 0
  }]
};

const MatchList: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [newMatch, setNewMatch] = useState<Omit<Match, '_id'>>(defaultMatch);
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Get user ID from localStorage
  const userData = localStorage.getItem('user');
  const currentUserId = userData ? JSON.parse(userData)._id : null;
  
  // Get user role from localStorage
  const userRole = localStorage.getItem('userRole') || '';
  const isAdmin = userRole === 'admin';
  const isSuperAdmin = userRole === 'superadmin';
  const isViewer = userRole === 'viewer';
  const isPlayer = userRole === 'player';
  
  // State for multi-select delete functionality
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const fetchMatches = useCallback(async () => {
    console.log('MatchList: fetchMatches called');
    console.log('MatchList: Authentication state:', {
      isAuthenticated: localStorage.getItem('isAuthenticated'),
      userRole: localStorage.getItem('userRole'),
      currentUserId
    });
    
    try {
      console.log('MatchList: Making API call to matchService.getAll() with userId:', currentUserId);
      const response = await matchService.getAll(currentUserId || undefined);
      console.log('MatchList: API response received:', response);
      console.log('MatchList: Setting matches state with', response.data?.length || 0, 'matches');
      setMatches(response.data);
    } catch (error: any) {
      console.error('MatchList: Error fetching matches:', error);
      console.error('MatchList: Error details:', {
        message: error?.message,
        response: error?.response,
        status: error?.response?.status,
        data: error?.response?.data
      });
    }
  }, [currentUserId]);

  const fetchTeams = async () => {
    console.log('MatchList: fetchTeams called');
    try {
      console.log('MatchList: Making API call to teamService.getAll()');
      const response = await teamService.getAll();
      console.log('MatchList: Teams API response received:', response);
      console.log('MatchList: Setting teams state with', response.data?.length || 0, 'teams');
      setTeams(response.data);
    } catch (error: any) {
      console.error('MatchList: Error fetching teams:', error);
      console.error('MatchList: Teams error details:', {
        message: error?.message,
        response: error?.response,
        status: error?.response?.status,
        data: error?.response?.data
      });
    }
  };

  useEffect(() => {
    console.log('MatchList: Component mounted, calling fetchMatches and fetchTeams');
    fetchMatches();
    fetchTeams();
  }, [fetchMatches]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  
  const handleEditOpen = (match: Match) => {
    setEditMatch(match);
    setEditOpen(true);
  };
  
  const handleEditClose = () => {
    setEditOpen(false);
    setEditMatch(null);
    setEditError(null);
    setEditLoading(false);
  };

  const handleSubmit = async () => {
    try {
      // Check if user is authenticated
      if (!currentUserId) {
        console.error('User not authenticated - currentUserId is null');
        alert('You must be logged in to create a match. Please log in again.');
        return;
      }

      // Create match with properly configured innings based on toss
      const matchToCreate = { 
        ...newMatch,
        createdBy: currentUserId // Add createdBy field
      };
      
      if (matchToCreate.tossWinner && matchToCreate.tossDecision) {
        // Determine batting and bowling teams based on toss
        let battingTeam: string;
        let bowlingTeam: string;
        
        const tossWinnerId = typeof matchToCreate.tossWinner === 'string' ? matchToCreate.tossWinner : matchToCreate.tossWinner._id;
        const team1Id = typeof matchToCreate.team1 === 'string' ? matchToCreate.team1 : matchToCreate.team1._id;
        const team2Id = typeof matchToCreate.team2 === 'string' ? matchToCreate.team2 : matchToCreate.team2._id;
        
        if (matchToCreate.tossDecision === 'bat') {
          // Toss winner chose to bat
          battingTeam = tossWinnerId;
          bowlingTeam = tossWinnerId === team1Id ? team2Id : team1Id;
        } else {
          // Toss winner chose to bowl
          bowlingTeam = tossWinnerId;
          battingTeam = tossWinnerId === team1Id ? team2Id : team1Id;
        }
        
        // Update first innings with correct team assignments
        matchToCreate.innings[0] = {
          ...matchToCreate.innings[0],
          battingTeam,
          bowlingTeam
        };
        
        // Add second innings
        matchToCreate.innings.push({
          battingTeam: bowlingTeam, // Teams swap for second innings
          bowlingTeam: battingTeam,
          totalRuns: 0,
          wickets: 0,
          overs: 0,
          balls: 0,
          isCompleted: false,
          battingStats: [],
          bowlingStats: [],
          currentState: {
            currentOver: 0,
            currentBall: 0,
            lastBallRuns: 0
          },
          extras: {
            wides: 0,
            noBalls: 0,
            byes: 0,
            legByes: 0,
            total: 0
          },
          runRate: 0
        });
      }
      
      await matchService.create(matchToCreate);
      handleClose();
      fetchMatches();
      setNewMatch(defaultMatch);
    } catch (error) {
      console.error('Error creating match:', error);
    }
  };

  const handleEditSubmit = async () => {
    if (!editMatch) return;

    setEditLoading(true);
    setEditError(null);

    try {
      console.log('Starting match edit with data:', editMatch);

      // Validate required fields
      if (!editMatch.team1 || !editMatch.team2) {
        throw new Error('Both teams must be selected');
      }

      if (!editMatch.overs || editMatch.overs <= 0) {
        throw new Error('Number of overs must be greater than 0');
      }

      // Update match with edited values
      const updatedMatch = { ...editMatch };

      // Ensure team IDs are strings (not objects)
      updatedMatch.team1 = typeof updatedMatch.team1 === 'string' ? updatedMatch.team1 : updatedMatch.team1._id;
      updatedMatch.team2 = typeof updatedMatch.team2 === 'string' ? updatedMatch.team2 : updatedMatch.team2._id;
      if (updatedMatch.tossWinner) {
        updatedMatch.tossWinner = typeof updatedMatch.tossWinner === 'string' ? updatedMatch.tossWinner : updatedMatch.tossWinner._id;
      }

      // Reconfigure innings if toss info changed and innings exist
      if (updatedMatch.tossWinner && updatedMatch.tossDecision && updatedMatch.innings && updatedMatch.innings.length > 0) {
        let battingTeam: string;
        let bowlingTeam: string;

        const tossWinnerId = updatedMatch.tossWinner;
        const team1Id = updatedMatch.team1;
        const team2Id = updatedMatch.team2;

        if (updatedMatch.tossDecision === 'bat') {
          battingTeam = tossWinnerId;
          bowlingTeam = tossWinnerId === team1Id ? team2Id : team1Id;
        } else {
          bowlingTeam = tossWinnerId;
          battingTeam = tossWinnerId === team1Id ? team2Id : team1Id;
        }

        // Update innings team assignments
        if (updatedMatch.innings[0]) {
          updatedMatch.innings[0].battingTeam = battingTeam;
          updatedMatch.innings[0].bowlingTeam = bowlingTeam;
        }

        if (updatedMatch.innings.length > 1 && updatedMatch.innings[1]) {
          updatedMatch.innings[1].battingTeam = bowlingTeam;
          updatedMatch.innings[1].bowlingTeam = battingTeam;
        }
      }

      // Prepare data to send - only include fields that can be edited for upcoming matches
      const updateData = {
        team1: updatedMatch.team1,
        team2: updatedMatch.team2,
        date: updatedMatch.date,
        venue: updatedMatch.venue,
        overs: updatedMatch.overs,
        tossWinner: updatedMatch.tossWinner,
        tossDecision: updatedMatch.tossDecision,
      };

      console.log('Sending update data:', updateData);

      await matchService.update(editMatch._id!, updateData as any);

      console.log('Match updated successfully');
      handleEditClose();
      fetchMatches();
    } catch (error: any) {
      console.error('Error updating match:', error);
      setEditError(error.message || 'Failed to update match. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  // SuperAdmin functions for multi-select delete
  const handleSelectMatch = (matchId: string) => {
    setSelectedMatches(prev => 
      prev.includes(matchId) 
        ? prev.filter(id => id !== matchId)
        : [...prev, matchId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMatches.length === matches.length) {
      setSelectedMatches([]);
    } else {
      setSelectedMatches(matches.map(match => match._id).filter(Boolean) as string[]);
    }
  };

  const handleDeleteSelectedOpen = () => {
    if (selectedMatches.length === 0) return;
    setIsDeleteDialogOpen(true);
    setDeleteConfirmText('');
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setDeleteConfirmText('');
  };

  const handleDeleteSelected = async () => {
    const expectedText = isMobile ? 'DELETE' : 'DELETE SELECTED MATCHES';
    if (deleteConfirmText !== expectedText) {
      return;
    }

    try {
      // Delete selected matches one by one
      for (const matchId of selectedMatches) {
        await matchService.delete(matchId);
      }
      
      // Clear local storage backup data for deleted matches
      if (selectedMatches.length === matches.length) {
        // If all matches deleted, clear all backup data
        localStorage.removeItem('matchBackup');
        localStorage.removeItem('currentOverBalls');
      }
      
      // Reset selection and refresh matches
      setSelectedMatches([]);
      await fetchMatches();
      handleDeleteDialogClose();
      
      console.log(`${selectedMatches.length} match(es) deleted successfully`);
    } catch (error) {
      console.error('Error deleting selected matches:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'primary';
      case 'in-progress':
        return 'warning';
      case 'completed':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box maxWidth="lg" sx={{ py: isMobile ? 1 : 3, px: isMobile ? 1 : 3, mx: 'auto' }}>
      {!isMobile && (
        <Paper 
          elevation={3}
          sx={{ 
            p: 3,
            background: 'linear-gradient(135deg, #020e43 0%, #764ba2 100%)',
            borderRadius: 3,
            color: 'white',
            mb: 3
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center'
          }}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 'bold',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              {(isAdmin || isSuperAdmin) ? 'Matches' : 'View Matches'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {(isAdmin || isSuperAdmin || isPlayer || (isViewer && matches.length === 0)) && (
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleOpen}
                  startIcon={<AddIcon />}
                  disabled={isViewer && matches.length >= 1} // Viewer can create max 1 match
                  sx={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    '&:hover': { 
                      backgroundColor: 'rgba(255, 255, 255, 0.3)',
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isViewer ? 'Create Demo Match' : 'Add Match'}
                </Button>
              )}
              {isSuperAdmin && (
                <>
                  <Button 
                    variant="outlined" 
                    color="secondary" 
                    onClick={handleSelectAll}
                    startIcon={selectedMatches.length === matches.length ? <DeselectIcon /> : <SelectAllIcon />}
                    sx={{ 
                      color: 'white',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      '&:hover': { 
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderColor: 'rgba(255, 255, 255, 0.5)'
                      }
                    }}
                  >
                    {selectedMatches.length === matches.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button 
                    variant="contained" 
                    color="error" 
                    onClick={handleDeleteSelectedOpen}
                    startIcon={<DeleteForeverIcon />}
                    disabled={selectedMatches.length === 0}
                    sx={{ 
                      backgroundColor: 'rgba(244, 67, 54, 0.8)',
                      '&:hover': { 
                        backgroundColor: 'rgba(244, 67, 54, 1)',
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Delete Selected ({selectedMatches.length})
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Paper>
      )}

      {/* Floating Action Button for Mobile */}
      {(isAdmin || isSuperAdmin || isPlayer || (isViewer && matches.length === 0)) && isMobile && (
        <Fab 
          aria-label="add"
          onClick={handleOpen}
          disabled={isViewer && matches.length >= 1} // Viewer can create max 1 match
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            background: 'linear-gradient(135deg, #020e43 0%, #764ba2 100%)',
            color: 'white',
            '&:hover': {
              background: 'linear-gradient(135deg, #764ba2 0%, #020e43 100%)',
              transform: 'scale(1.1)',
            },
            transition: 'all 0.3s ease',
            '&:disabled': {
              background: 'rgba(158, 158, 158, 0.5)',
              color: 'rgba(255, 255, 255, 0.5)',
            }
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {isMobile ? (
        // Mobile Card Layout
        <Stack spacing={2}>
          {matches.map((match) => (
            <Card 
              key={match._id}
              elevation={3}
              sx={{ 
                borderRadius: 2,
                border: selectedMatches.includes(match._id || '') ? '2px solid #f44336' : '1px solid rgba(0,0,0,0.1)',
                backgroundColor: selectedMatches.includes(match._id || '') ? 'rgba(244, 67, 54, 0.05)' : 'inherit'
              }}
            >
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    {isSuperAdmin && (
                      <Checkbox
                        checked={selectedMatches.includes(match._id || '')}
                        onChange={() => handleSelectMatch(match._id || '')}
                        color="error"
                        sx={{ mt: -0.5, mr: 1 }}
                      />
                    )}
                    <Typography variant="h6" sx={{ fontWeight: 'bold', flex: 1 }}>
                      {typeof match.team1 === 'object' ? match.team1.name : match.team1} 
                      <Box component="span" sx={{ color: 'text.secondary', mx: 1 }}>vs</Box>
                      {typeof match.team2 === 'object' ? match.team2.name : match.team2}
                    </Typography>
                    <Chip 
                      label={match.status} 
                      color={getStatusColor(match.status) as any}
                      size="small"
                    />
                  </Box>
                  
                  <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      📅 {new Date(match.date).toLocaleDateString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      🏏 {match.overs} overs
                    </Typography>
                  </Stack>

                  {match.innings && match.innings.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      {match.innings.map((inning, index) => (
                        <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                          <strong>{index === 0 ? '1st Innings' : '2nd Innings'}:</strong> {inning.totalRuns}/{inning.wickets} ({inning.overs} ov)
                        </Typography>
                      ))}
                      {match.result && (
                        <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold', mt: 1 }}>
                          🏆 {match.result}
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
                
                <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                    <Button
                      size="medium"
                      variant="outlined"
                      startIcon={<VisibilityIcon />}
                      onClick={() => {
                        // Store navigation source for breadcrumb tracking
                        sessionStorage.setItem('matchNavigationSource', 'matches');
                        navigate(`/matches/${match._id}/overview`);
                      }}
                      sx={{ flex: 1 }}
                    >
                      View Details
                    </Button>
                    {isAdmin && match.status === 'upcoming' && (
                      <Button 
                        color="info" 
                        size="medium"
                        variant="outlined"
                        onClick={() => handleEditOpen(match)}
                      >
                        Edit
                      </Button>
                    )}
                  </Stack>
                </CardActions>
              </Card>
          ))}
        </Stack>
      ) : (
        // Desktop Table Layout
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                {isSuperAdmin && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedMatches.length > 0 && selectedMatches.length < matches.length}
                      checked={matches.length > 0 && selectedMatches.length === matches.length}
                      onChange={handleSelectAll}
                      color="error"
                    />
                  </TableCell>
                )}
                <TableCell>Teams</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>{isMobile ? 'O' : 'Overs'}</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Result</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {matches.map((match) => (
                <TableRow 
                  key={match._id}
                  sx={{
                    backgroundColor: selectedMatches.includes(match._id || '') ? 'rgba(244, 67, 54, 0.05)' : 'inherit'
                  }}
                >
                  {isSuperAdmin && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedMatches.includes(match._id || '')}
                        onChange={() => handleSelectMatch(match._id || '')}
                        color="error"
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    {typeof match.team1 === 'object' ? match.team1.name : match.team1} vs{' '}
                    {typeof match.team2 === 'object' ? match.team2.name : match.team2}
                  </TableCell>
                  <TableCell>{new Date(match.date).toLocaleDateString()}</TableCell>
                  <TableCell>{match.overs}</TableCell>
                  <TableCell>
                    <Chip 
                      label={match.status} 
                      color={getStatusColor(match.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {match.innings && match.innings.length > 0 ? (
                      <Box>
                        {match.innings.map((inning, index) => (
                          <Typography key={index} variant="body2">
                            {index === 0 ? '1st' : '2nd'}: {inning.totalRuns}/{inning.wickets} ({inning.overs} ov)
                          </Typography>
                        ))}
                        {match.result && (
                          <Typography variant="body2" color="primary">
                            {match.result}
                          </Typography>
                        )}
                      </Box>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button 
                        color="primary" 
                        size="small" 
                        variant="outlined"
                        startIcon={<VisibilityIcon />}
                        onClick={() => {
                          // Store navigation source for breadcrumb tracking
                          sessionStorage.setItem('matchNavigationSource', 'matches');
                          navigate(`/matches/${match._id}/overview`);
                        }}
                      >
                        View Details
                      </Button>
                      {isAdmin && match.status === 'upcoming' && (
                        <Button 
                          color="info" 
                          size="small"
                          variant="outlined"
                          onClick={() => handleEditOpen(match)}
                        >
                          Edit
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog 
        open={open} 
        onClose={handleClose}
        fullScreen={isMobile}
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
          Add New Match
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Autocomplete
            fullWidth
            options={teams}
            getOptionLabel={(option) => option.name}
            value={teams.find(team => team._id === newMatch.team1) || null}
            onChange={(event, newValue) => {
              setNewMatch({ ...newMatch, team1: newValue?._id || '' });
            }}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label="Team 1"
                margin="dense"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Typography>{option.name}</Typography>
              </Box>
            )}
          />
          <Autocomplete
            fullWidth
            options={teams}
            getOptionLabel={(option) => option.name}
            value={teams.find(team => team._id === newMatch.team2) || null}
            onChange={(event, newValue) => {
              setNewMatch({ ...newMatch, team2: newValue?._id || '' });
            }}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label="Team 2"
                margin="dense"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Typography>{option.name}</Typography>
              </Box>
            )}
          />
          <TextField
            margin="dense"
            label="Number of Overs"
            type="number"
            fullWidth
            value={newMatch.overs}
            onChange={(e) => setNewMatch({ ...newMatch, overs: Number(e.target.value) })}
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
            margin="dense"
            label="Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={new Date(newMatch.date).toISOString().split('T')[0]}
            onChange={(e) => setNewMatch({ ...newMatch, date: new Date(e.target.value).toISOString() })}
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
            margin="dense"
            label="Venue"
            fullWidth
            value={newMatch.venue}
            onChange={(e) => setNewMatch({ ...newMatch, venue: e.target.value })}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
          />
          
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            🏏 Toss Information
          </Typography>
          
          <Autocomplete
            fullWidth
            options={teams.filter(team => 
              team._id === newMatch.team1 || team._id === newMatch.team2
            )}
            getOptionLabel={(option) => `${option.name} ${option._id === newMatch.team1 ? '(Team 1)' : '(Team 2)'}`}
            value={teams.find(team => team._id === newMatch.tossWinner) || null}
            onChange={(event, newValue) => {
              setNewMatch({ ...newMatch, tossWinner: newValue?._id || '' });
            }}
            disabled={!newMatch.team1 || !newMatch.team2}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label="Toss Winner"
                margin="dense"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Typography>{option.name} {option._id === newMatch.team1 ? '(Team 1)' : '(Team 2)'}</Typography>
              </Box>
            )}
          />
          
          <Autocomplete
            fullWidth
            options={[
              { value: 'bat', label: 'Chose to Bat First' },
              { value: 'bowl', label: 'Chose to Bowl First' }
            ]}
            getOptionLabel={(option) => option.label}
            value={newMatch.tossDecision ? { value: newMatch.tossDecision, label: newMatch.tossDecision === 'bat' ? 'Chose to Bat First' : 'Chose to Bowl First' } : null}
            onChange={(event, newValue) => {
              setNewMatch({ ...newMatch, tossDecision: (newValue?.value as 'bat' | 'bowl') || '' });
            }}
            disabled={!newMatch.tossWinner}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label="Toss Decision"
                margin="dense"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Typography>{option.label}</Typography>
              </Box>
            )}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={handleClose}
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
            onClick={handleSubmit} 
            variant="contained" 
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
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Match Dialog */}
      <Dialog 
        open={editOpen} 
        onClose={handleEditClose}
        fullScreen={isMobile}
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
          Edit Match
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {editError && (
            <Alert severity="error" sx={{ mb: 2, backgroundColor: 'rgba(255, 255, 255, 0.9)', color: '#d32f2f' }}>
              {editError}
            </Alert>
          )}
          
          {editMatch && (
            <>
              <Autocomplete
                fullWidth
                options={teams}
                getOptionLabel={(option) => option.name}
                value={teams.find(team => team._id === (typeof editMatch.team1 === 'string' ? editMatch.team1 : editMatch.team1._id)) || undefined}
                onChange={(event, newValue) => {
                  if (newValue && newValue._id) {
                    setEditMatch({ ...editMatch, team1: newValue._id });
                    setEditError(null); // Clear error when user makes changes
                  }
                }}
                disableClearable
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Team 1"
                    margin="dense"
                    error={!editMatch.team1}
                    helperText={!editMatch.team1 ? 'Team 1 is required' : ''}
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
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Typography>{option.name}</Typography>
                  </Box>
                )}
              />
              <Autocomplete
                fullWidth
                options={teams}
                getOptionLabel={(option) => option.name}
                value={teams.find(team => team._id === (typeof editMatch.team2 === 'string' ? editMatch.team2 : editMatch.team2._id)) || undefined}
                onChange={(event, newValue) => {
                  if (newValue && newValue._id) {
                    setEditMatch({ ...editMatch, team2: newValue._id });
                    setEditError(null); // Clear error when user makes changes
                  }
                }}
                disableClearable
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Team 2"
                    margin="dense"
                    error={!editMatch.team2}
                    helperText={!editMatch.team2 ? 'Team 2 is required' : ''}
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
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Typography>{option.name}</Typography>
                  </Box>
                )}
              />
              <TextField
                margin="dense"
                label="Number of Overs"
                type="number"
                fullWidth
                value={editMatch.overs}
                onChange={(e) => {
                  setEditMatch({ ...editMatch, overs: Number(e.target.value) });
                  setEditError(null); // Clear error when user makes changes
                }}
                error={!editMatch.overs || editMatch.overs <= 0}
                helperText={!editMatch.overs || editMatch.overs <= 0 ? 'Overs must be greater than 0' : ''}
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
              <TextField
                margin="dense"
                label="Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={new Date(editMatch.date).toISOString().split('T')[0]}
                onChange={(e) => {
                  setEditMatch({ ...editMatch, date: new Date(e.target.value).toISOString() });
                  setEditError(null); // Clear error when user makes changes
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
                margin="dense"
                label="Venue"
                fullWidth
                value={editMatch.venue}
                onChange={(e) => {
                  setEditMatch({ ...editMatch, venue: e.target.value });
                  setEditError(null); // Clear error when user makes changes
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
              
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                🏏 Toss Information
              </Typography>
              
              <Autocomplete
                fullWidth
                options={teams.filter(team => {
                  const team1Id = typeof editMatch.team1 === 'string' ? editMatch.team1 : editMatch.team1._id;
                  const team2Id = typeof editMatch.team2 === 'string' ? editMatch.team2 : editMatch.team2._id;
                  return team._id === team1Id || team._id === team2Id;
                })}
                getOptionLabel={(option) => {
                  const team1Id = typeof editMatch.team1 === 'string' ? editMatch.team1 : editMatch.team1._id;
                  return `${option.name} ${option._id === team1Id ? '(Team 1)' : '(Team 2)'}`;
                }}
                value={teams.find(team => team._id === editMatch.tossWinner) || undefined}
                onChange={(event, newValue) => {
                  setEditMatch({ ...editMatch, tossWinner: newValue && newValue._id ? newValue._id : undefined });
                  setEditError(null); // Clear error when user makes changes
                }}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Toss Winner"
                    margin="dense"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': {
                          borderColor: theme.palette.primary.main,
                        },
                      },
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  const team1Id = typeof editMatch.team1 === 'string' ? editMatch.team1 : editMatch.team1._id;
                  return (
                    <Box component="li" {...props}>
                      <Typography>{option.name} {option._id === team1Id ? '(Team 1)' : '(Team 2)'}</Typography>
                    </Box>
                  );
                }}
              />
              
              <Autocomplete
                fullWidth
                options={[
                  { value: 'bat', label: 'Chose to Bat First' },
                  { value: 'bowl', label: 'Chose to Bowl First' }
                ]}
                getOptionLabel={(option) => option.label}
                value={editMatch.tossDecision ? { value: editMatch.tossDecision, label: editMatch.tossDecision === 'bat' ? 'Chose to Bat First' : 'Chose to Bowl First' } : null}
                onChange={(event, newValue) => {
                  setEditMatch({ ...editMatch, tossDecision: (newValue?.value as 'bat' | 'bowl') || '' });
                  setEditError(null); // Clear error when user makes changes
                }}
                disabled={!editMatch.tossWinner}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Toss Decision"
                    margin="dense"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': {
                          borderColor: theme.palette.primary.main,
                        },
                      },
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Typography>{option.label}</Typography>
                  </Box>
                )}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={handleEditClose} 
            disabled={editLoading}
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
            onClick={handleEditSubmit} 
            variant="contained" 
            disabled={editLoading || !editMatch?.team1 || !editMatch?.team2 || !editMatch?.overs || editMatch.overs <= 0}
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
            {editLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SuperAdmin Multi-Select Delete Confirmation Dialog */}
      <Dialog 
        open={isDeleteDialogOpen} 
        onClose={handleDeleteDialogClose}
        maxWidth={isMobile ? "xs" : "md"}
        fullWidth
        PaperProps={{
          sx: {
            ...(isMobile && {
              m: 1,
              maxHeight: '90vh'
            })
          }
        }}
      >
        <DialogTitle sx={{ 
          color: 'error.main', 
          fontWeight: 'bold',
          fontSize: isMobile ? '1.1rem' : '1.25rem',
          py: isMobile ? 1.5 : 2
        }}>
          ⚠️ Delete {selectedMatches.length} Match{selectedMatches.length > 1 ? 'es' : ''}?
        </DialogTitle>
        <DialogContent sx={{ py: isMobile ? 1 : 2 }}>
          <Alert severity="warning" sx={{ mb: isMobile ? 2 : 3 }}>
            <AlertTitle sx={{ fontWeight: 'bold', fontSize: isMobile ? '0.9rem' : '1rem' }}>
              ⚠️ Permanent Deletion
            </AlertTitle>
            {isMobile ? (
              <Typography variant="body2">
                This will permanently delete {selectedMatches.length} match record{selectedMatches.length > 1 ? 's' : ''} and cannot be undone!
              </Typography>
            ) : (
              <>
                This action will permanently delete the selected {selectedMatches.length} match record(s) from the database and cannot be undone!
                <br /><br />
                <strong>What will be deleted:</strong>
                <ul>
                  <li>Selected match data (scores, statistics, players, etc.)</li>
                  <li>All innings information for selected matches</li>
                  <li>All ball-by-ball records for selected matches</li>
                  <li>Related local storage backup data</li>
                </ul>
              </>
            )}
          </Alert>
          
          {isMobile ? (
            <Typography variant="body2" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}>
              Type <code style={{ backgroundColor: '#fff3e0', padding: '2px 6px', borderRadius: '4px', color: '#f57c00' }}>DELETE</code> to confirm:
            </Typography>
          ) : (
            <Typography variant="body1" sx={{ mb: 2, fontWeight: 'bold' }}>
              To confirm this action, type exactly: <code style={{ backgroundColor: '#fff3e0', padding: '4px 8px', borderRadius: '4px', color: '#f57c00' }}>DELETE SELECTED MATCHES</code>
            </Typography>
          )}
          
          <TextField
            fullWidth
            label="Confirmation Text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={isMobile ? "Type: DELETE" : "Type: DELETE SELECTED MATCHES"}
            error={deleteConfirmText !== '' && deleteConfirmText !== (isMobile ? 'DELETE' : 'DELETE SELECTED MATCHES')}
            helperText={deleteConfirmText !== '' && deleteConfirmText !== (isMobile ? 'DELETE' : 'DELETE SELECTED MATCHES') ? 'Text must match exactly' : ''}
            sx={{ mb: isMobile ? 1 : 2 }}
            size={isMobile ? "small" : "medium"}
          />
          
          {!isMobile && (
            <Typography variant="body2" color="text.secondary">
              <strong>SuperAdmin Only:</strong> Only users with superadmin privileges can perform this operation.
              <br />
              <strong>Selected Matches:</strong> {selectedMatches.length} of {matches.length} total matches
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          px: isMobile ? 1 : 3,
          py: isMobile ? 1 : 2,
          gap: isMobile ? 1 : 2
        }}>
          <Button 
            onClick={handleDeleteDialogClose} 
            color="primary"
            size={isMobile ? "small" : "medium"}
            sx={{ minWidth: isMobile ? '70px' : 'auto' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteSelected}
            color="error"
            variant="contained"
            disabled={deleteConfirmText !== (isMobile ? 'DELETE' : 'DELETE SELECTED MATCHES')}
            startIcon={!isMobile ? <DeleteForeverIcon /> : undefined}
            size={isMobile ? "small" : "medium"}
            sx={{ minWidth: isMobile ? '70px' : 'auto' }}
          >
            {isMobile ? (
              <>
                <DeleteForeverIcon sx={{ mr: 0.5 }} />
                Delete
              </>
            ) : (
              `Delete ${selectedMatches.length} Match(es)`
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MatchList;