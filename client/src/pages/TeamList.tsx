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
  Stack,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Container,
  useTheme,
  useMediaQuery,
  Chip,
  Autocomplete,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Fab
} from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { Team, Player } from '../types';
import { teamService, playerService } from '../services/api.service';

interface TeamFormData {
  name: string;
  captain?: string;
  members: string[];
}

const defaultTeam: TeamFormData = {
  name: '',
  captain: '', // Explicitly set to empty string
  members: []
};

const TeamList: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    // Load current user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (e) {
        setCurrentUser(null);
      }
    }
  }, []);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [newTeam, setNewTeam] = useState<TeamFormData>(defaultTeam);
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  // Conflict pre-check state for team deletion
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflicts, setConflicts] = useState<{ _id: string; label: string }[]>([]);

  const fetchPlayers = useCallback(async (currentEditingTeam?: Team | null) => {
    try {
      const response = await playerService.getAll();
      // Filter out players without _id to ensure type safety
      const validPlayers = response.data.filter((player: Player) => player._id);

      // Use the provided currentEditingTeam or fall back to state
      const effectiveEditingTeam = currentEditingTeam !== undefined ? currentEditingTeam : editingTeam;

      // Filter out players who are already assigned to teams (excluding current editing team)
      const assignedPlayerIds = teams
        .filter(team => effectiveEditingTeam ? team._id !== effectiveEditingTeam._id : true)
        .flatMap(team => team.members.map(member => typeof member === 'object' ? member._id : member));

      const availablePlayers = validPlayers.filter(player => !assignedPlayerIds.includes(player._id || ''));

      // If editing a team, include the players that are already in that team
      if (effectiveEditingTeam) {
        const editingTeamPlayerIds = effectiveEditingTeam.members.map(member => 
          typeof member === 'object' ? member._id : member
        ).filter(Boolean);
        
        const editingTeamPlayers = validPlayers.filter(player => 
          editingTeamPlayerIds.includes(player._id || '')
        );
        
        // Combine available players with editing team players
        const combinedPlayers = [...availablePlayers, ...editingTeamPlayers];
        // Remove duplicates
        const uniquePlayers = combinedPlayers.filter((player, index, self) => 
          index === self.findIndex(p => p._id === player._id)
        );
        
        setPlayers(uniquePlayers);
      } else {
        setPlayers(availablePlayers);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
      setError('Failed to fetch players');
    }
  }, [teams, editingTeam]);

  const fetchTeams = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (currentUser?.userRole === 'admin' || currentUser?.userRole === 'superadmin') {
        response = await teamService.getAll();
      } else {
        response = await teamService.getAll(currentUser?._id);
      }
      setTeams(response.data);
    } catch (error) {
      setError('Failed to fetch teams. Please try again.');
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchPlayers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch players whenever teams data changes (but not when editingTeam changes to avoid loops)
  useEffect(() => {
    if (teams.length >= 0) { // teams is initialized as empty array
      fetchPlayers();
    }
  }, [teams.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpen = () => {
    setEditingTeam(null);
    setNewTeam(defaultTeam);
    setOpen(true);
  };

  // When user clicks Add, check team creation limits and either open dialog or show error
  const handleAddClick = () => {
    if ((currentUser?.userRole === 'guest' || currentUser?.userRole === 'viewer') && teams.length >= 2) {
      setError('Guest users can only create up to 2 teams');
      return;
    }
    handleOpen();
  };

  const handleClose = () => {
    setOpen(false);
    setNewTeam(defaultTeam);
    setEditingTeam(null);
    setError(null);
    // Refresh players list when closing dialog
    fetchPlayers();
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);

    // Handle captain value properly
    let captainValue = '';
    if (team.captain) {
      if (typeof team.captain === 'object') {
        captainValue = team.captain._id || '';
      } else if (typeof team.captain === 'string') {
        captainValue = team.captain;
      }
    }

    setNewTeam({
      name: team.name,
      captain: captainValue,
      members: team.members.map(member => typeof member === 'object' ? member._id : member)
    });
    setOpen(true);
    // Refresh players list to include players from current team
    fetchPlayers(team);
  };

  // Delete dialog handlers
  const handleDeleteClick = (team: Team) => {
    setTeamToDelete(team);
    // Pre-check for conflicts (in-progress matches) before opening delete confirmation
    (async () => {
      try {
        const resp = await teamService.getConflicts(team._id!);
        const found = resp.data?.conflicts || [];
        if (found.length > 0) {
          setConflicts(found);
          setConflictDialogOpen(true);
        } else {
          setDeleteDialogOpen(true);
        }
      } catch (err) {
        console.error('Error checking team conflicts:', err);
        setDeleteDialogOpen(true);
      }
    })();
  };

  const handleDeleteConfirm = async () => {
    if (!teamToDelete?._id) return;
    
    setLoading(true);
    setError(null);
    try {
      await teamService.delete(teamToDelete._id);
      fetchTeams();
      setDeleteDialogOpen(false);
      setTeamToDelete(null);
    } catch (error: any) {
      console.error('Error deleting team:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to delete team';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setTeamToDelete(null);
  };

  const handleConflictDialogClose = () => {
    setConflictDialogOpen(false);
    setConflicts([]);
    setTeamToDelete(null);
  };

  const handleSubmit = async (continueAdding: boolean = false) => {
  // Form submission started (debug log removed)
    
    if (!newTeam.name) {
      setError('Please fill in team name');
      return;
    }

    // Enforce guest/viewer creation limit: max 2 teams
    if ((currentUser?.userRole === 'guest' || currentUser?.userRole === 'viewer') && teams.length >= 2) {
      setError('Guest/viewer users can create up to 2 teams');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Create a clean team data object
      const teamData: Partial<Team> = {
        name: newTeam.name.trim(),
        members: newTeam.members || []
      };
      
      // Only add captain if a valid one is selected
  // Captain value before processing (debug log removed)
      if (newTeam.captain && 
          newTeam.captain.trim() !== '' && 
          newTeam.captain !== 'undefined' && 
          newTeam.captain !== 'null') {
  teamData.captain = newTeam.captain.trim();
      } else {
        // No captain selected, captain field omitted (debug log removed)
      }
      
  // Sending team data (debug log removed)
      
      let savedTeam: Team;
  if (editingTeam?._id) {
        // Update existing team
        const updateResponse = await teamService.update(editingTeam._id, teamData);
        savedTeam = updateResponse.data;
        
        // Update players' teams array
        if (savedTeam._id) {
          const memberIds = (teamData.members || []).map(member => 
            typeof member === 'string' ? member : member._id
          ).filter(Boolean);
          await updatePlayerTeams(savedTeam._id, memberIds);
        }

        if (continueAdding) {
          setEditingTeam(null);
          setNewTeam(defaultTeam);
          setSuccess('Team updated');
        } else {
          handleClose();
        }
      } else {
        // Create new team (no members initially)
        const createResponse = await teamService.create({ name: newTeam.name.trim() });
        savedTeam = createResponse.data;

        if (continueAdding) {
          // Clear form for next create but keep dialog open
          setNewTeam(defaultTeam);
          setSuccess('Team created');
        } else {
          handleClose();
        }
      }
      
      // Refresh teams and players lists
      fetchTeams();
      fetchPlayers();
    } catch (error: any) {
      console.error('Error saving team:', error); // Debug log
      const server = error?.response?.data;
      if (server && server.message) {
        if (server.limit !== undefined) {
          setError(`${server.message} (limit: ${server.limit}, you have: ${server.currentCount || 0})`);
        } else {
          setError(editingTeam ? `Failed to update team: ${server.message}` : `Failed to create team: ${server.message}`);
        }
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
        setError(editingTeam ? `Failed to update team: ${errorMessage}` : `Failed to create team: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to update players' teams array
  const updatePlayerTeams = async (teamId: string, memberIds: string[]) => {
    try {
      // Get all players to see their current team assignments
      const allPlayers = await playerService.getAll();
      
      // Find players who are currently in this team
      const currentTeamMembers = allPlayers.data.filter(player => 
        player.teams && player.teams.some(team => 
          (typeof team === 'string' ? team : team._id) === teamId
        )
      );
      
      // Find players who should be in this team (selected members)
      const selectedPlayers = allPlayers.data.filter(player => 
        memberIds.includes(player._id || '')
      );
      
      // Players to add to this team
      const playersToAdd = selectedPlayers.filter(player => 
        !currentTeamMembers.some(current => current._id === player._id)
      );
      
      // Players to remove from this team
      const playersToRemove = currentTeamMembers.filter(player => 
        !memberIds.includes(player._id || '')
      );
      
      // Prepare updates
      const playerUpdates: { playerId: string; teams: string[] }[] = [];
      
      // Add team to players who were added
      playersToAdd.forEach(player => {
        const currentTeams = player.teams ? player.teams.map(team => 
          typeof team === 'string' ? team : team._id
        ).filter(Boolean) : [];
        playerUpdates.push({
          playerId: player._id!,
          teams: [...currentTeams, teamId]
        });
      });
      
      // Remove team from players who were removed
      playersToRemove.forEach(player => {
        const currentTeams = player.teams ? player.teams.map(team => 
          typeof team === 'string' ? team : team._id
        ).filter(Boolean) : [];
        playerUpdates.push({
          playerId: player._id!,
          teams: currentTeams.filter(teamIdFromArray => teamIdFromArray !== teamId)
        });
      });
      
      // Update players if there are changes
      if (playerUpdates.length > 0) {
        // Updating player teams (debug logs removed)
        await playerService.updatePlayerTeams(playerUpdates);
      }
    } catch (error) {
      console.error('Error updating player teams:', error);
      throw new Error('Failed to update player team assignments');
    }
  };

  return (
  <Container maxWidth="lg" sx={{ py: isMobile ? 2 : 3, px: { xs: 1, sm: 3 } }}>
      {/* Header with Navy Gradient Theme */}
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
              Teams
            </Typography>
            {((currentUser?.userRole === 'guest' || currentUser?.userRole === 'viewer') && teams.length >= 2) ? (
              <Tooltip title="Guest users can only create up to 2 teams" arrow>
                <span>
                  <Button
                    variant="contained"
                    onClick={handleAddClick}
                    disabled={loading}
                    startIcon={<AddIcon />}
                  >
                    Add Team
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Button 
                variant="contained" 
                onClick={handleAddClick}
                disabled={loading}
                startIcon={<AddIcon />}
              >
                Add Team
              </Button>
            )}
            {(currentUser?.userRole === 'guest' || currentUser?.userRole === 'viewer') && teams.length >= 2 && (
              <Typography variant="caption" color="error" sx={{ ml: 2 }}>
                Guest users can only create up to 2 teams.
              </Typography>
            )}
          </Box>
        </Paper>
      )}

      {/* Floating Action Button for Mobile */}
      {isMobile && (
        <Fab 
          aria-label="add team"
          onClick={handleAddClick}
          disabled={loading}
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
            '&.Mui-disabled': {
              background: 'rgba(0, 0, 0, 0.12)',
              color: 'rgba(0, 0, 0, 0.26)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : isMobile ? (
        // Mobile Card Layout
        <Stack spacing={2}>
          {teams.map((team) => (
            <Card key={team._id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="h2">
                    {team.name}
                  </Typography>
                  <Chip 
                    label={`${team.members.length} members`} 
                    color="primary" 
                    size="small"
                  />
                </Box>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Captain:</Typography>
                    <Typography variant="body2">
                      {team.captain && typeof team.captain === 'object' ? team.captain.name : team.captain || 'No Captain'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Total Members:</Typography>
                    <Typography variant="body2">{team.members.length}</Typography>
                  </Box>
                </Stack>
              </CardContent>
              <CardActions>
                <Button
                  onClick={() => handleEdit(team)}
                  color="primary"
                  size="small"
                  sx={{ 
                    minWidth: isMobile ? '40px' : 'auto',
                    px: isMobile ? 1 : 2 
                  }}
                >
                  {isMobile ? <EditIcon /> : (
                    <>
                      <EditIcon sx={{ mr: 1 }} />
                      Edit
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleDeleteClick(team)}
                  color="error"
                  size="small"
                  sx={{ 
                    minWidth: isMobile ? '40px' : 'auto',
                    px: isMobile ? 1 : 2 
                  }}
                >
                  {isMobile ? <DeleteIcon /> : (
                    <>
                      <DeleteIcon sx={{ mr: 1 }} />
                      Delete
                    </>
                  )}
                </Button>
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
                <TableCell>Name</TableCell>
                <TableCell>Captain</TableCell>
                <TableCell>Members</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team._id}>
                  <TableCell>{team.name}</TableCell>
                  <TableCell>{team.captain && typeof team.captain === 'object' ? team.captain.name : team.captain || 'No Captain'}</TableCell>
                  <TableCell>{team.members.length}</TableCell>
                  <TableCell>
                    <IconButton 
                      onClick={() => handleEdit(team)}
                      color="primary"
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDeleteClick(team)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
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
          {editingTeam ? 'Edit Team' : 'Create New Team'}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2} sx={{ mt: 2, minWidth: { xs: 'auto', sm: 400 } }}>
            <TextField
              label="Team Name"
              value={newTeam.name}
              onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
              fullWidth
              required
              error={!newTeam.name && error != null}
              size={isMobile ? "small" : "medium"}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                },
              }}
            />
            
            {/* Only show team members and captain fields when editing */}
            {editingTeam && (
              <>
                <FormControl component="fieldset" sx={{ width: '100%' }}>
                  <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
                    Team Members (Optional)
                  </FormLabel>
                  <FormGroup sx={{
                    maxHeight: isMobile ? 250 : 300, // Increased height for mobile
                    overflow: 'auto',
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    p: 1,
                    '&::-webkit-scrollbar': {
                      width: '6px',
                    },
                    '&::-webkit-scrollbar-track': {
                      backgroundColor: '#f1f1f1',
                      borderRadius: '3px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: '#c1c1c1',
                      borderRadius: '3px',
                      '&:hover': {
                        backgroundColor: '#a8a8a8',
                      },
                    },
                  }}>
                    {players.map((player) => (
                      <FormControlLabel
                        key={player._id}
                        control={
                          <Checkbox
                            checked={newTeam.members.includes(player._id || '')}
                            onChange={(event) => {
                              const playerId = player._id || '';
                              if (event.target.checked) {
                                setNewTeam({
                                  ...newTeam,
                                  members: [...newTeam.members, playerId]
                                });
                              } else {
                                setNewTeam({
                                  ...newTeam,
                                  members: newTeam.members.filter(id => id !== playerId)
                                });
                              }
                            }}
                            size={isMobile ? "small" : "medium"}
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">
                              {player.name}
                            </Typography>
                            <Chip
                              label={player.role}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: '18px' }}
                            />
                          </Box>
                        }
                        sx={{
                          mb: 0.5,
                          '& .MuiFormControlLabel-label': {
                            width: '100%',
                          }
                        }}
                      />
                    ))}
                    {players.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        No available players. All players are already assigned to teams.
                      </Typography>
                    )}
                  </FormGroup>
                </FormControl>
                
                <Autocomplete
                  fullWidth
                  options={[{ _id: '', name: 'No Captain' }, ...players.filter(p => newTeam.members.includes(p._id || ''))]}
                  getOptionLabel={(option) => option.name}
                  value={newTeam.captain ? players.find(p => p._id === newTeam.captain) || null : null}
                  onChange={(event, newValue) => {
                    const value = newValue?._id || '';
                    // Captain selection changed (debug log removed)
                    setNewTeam({ ...newTeam, captain: value });
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Captain (Optional)"
                      size={isMobile ? "small" : "medium"}
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
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={handleClose}
            size={isMobile ? "small" : "medium"}
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
          {/* Create & Continue - only for new creates (not when editing) */}
          {!editingTeam && (
            <Button
              onClick={() => handleSubmit(true)}
              variant="contained"
              disabled={loading || !newTeam.name || ((currentUser?.userRole === 'guest' || currentUser?.userRole === 'viewer') && teams.length >= 2)}
              size={isMobile ? "small" : "medium"}
              sx={{
                mr: 1,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1.1rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #0b6b4f 0%, #2fb58b 100%)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
                color: 'white !important',
                '&:hover': { opacity: 0.95 },
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Create & Continue'}
            </Button>
          )}

          <Button 
            onClick={() => handleSubmit(false)} 
            variant="contained" 
            disabled={loading || !newTeam.name}
            size={isMobile ? "small" : "medium"}
            sx={{
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1.1rem',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #020e43 0%, #764ba2 100%)',
              boxShadow: '0 4px 12px rgba(2, 14, 67, 0.4)',
              color: 'white !important', // Ensure text is white
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #020e43 100%)',
                boxShadow: '0 6px 16px rgba(118, 75, 162, 0.6)',
                transform: 'translateY(-2px)',
              },
              '&:disabled': {
                background: 'rgba(0, 0, 0, 0.12)',
                color: 'rgba(0, 0, 0, 0.26) !important',
              },
              transition: 'all 0.3s ease',
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : editingTeam ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={error !== null} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>

          <Snackbar
            open={success !== null}
            autoHideDuration={3000}
            onClose={() => setSuccess(null)}
          >
            <Alert onClose={() => setSuccess(null)} severity="success">
              {success}
            </Alert>
          </Snackbar>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={handleDeleteCancel}
        maxWidth={isMobile ? "xs" : "sm"}
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
          ⚠️ Delete Team?
        </DialogTitle>
        <DialogContent sx={{ py: isMobile ? 1 : 2 }}>
          <Typography variant="body1">
            Are you sure you want to delete the team <strong>"{teamToDelete?.name}"</strong>?
          </Typography>
          {!isMobile && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This action cannot be undone.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          px: isMobile ? 1 : 3,
          py: isMobile ? 1 : 2,
          gap: isMobile ? 1 : 2
        }}>
          <Button 
            onClick={handleDeleteCancel} 
            color="primary"
            size={isMobile ? "small" : "medium"}
            sx={{ minWidth: isMobile ? '70px' : 'auto' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={loading}
            startIcon={!isMobile && !loading ? <DeleteIcon /> : undefined}
            size={isMobile ? "small" : "medium"}
            sx={{ minWidth: isMobile ? '70px' : 'auto' }}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : isMobile ? (
              <>
                <DeleteIcon sx={{ mr: 0.5 }} />
                Delete
              </>
            ) : (
              'Delete Team'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Conflict Dialog (shown when pre-check finds in-progress matches for this team) */}
      <Dialog
        open={conflictDialogOpen}
        onClose={handleConflictDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'warning.main', fontWeight: 'bold' }}>Cannot delete team</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            This team cannot be deleted because it is involved in one or more in-progress match(es):
          </Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {conflicts.map(c => (
              <Box key={c._id} sx={{ py: 0.5 }}>
                <Typography variant="body2">• {c.label}</Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConflictDialogClose} variant="contained">OK</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeamList;