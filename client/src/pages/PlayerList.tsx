import React, { useState, useEffect } from 'react';
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
  Fab
} from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { Player, Team } from '../types';
import { playerService, teamService } from '../services/api.service';

const defaultPlayer: Omit<Player, '_id'> = {
  name: '',
  age: 0,
  role: 'batsman',
  battingStyle: 'right-handed',
  bowlingStyle: '',
  teams: []
};

const PlayerList: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [newPlayer, setNewPlayer] = useState<Omit<Player, '_id'>>(defaultPlayer);
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
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  // Conflict pre-check state
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflicts, setConflicts] = useState<{ _id: string; label: string }[]>([]);



  useEffect(() => {
    fetchPlayers();
    fetchTeams();
    // Load current user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (e) {
        setCurrentUser(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const fetchTeams = async () => {
    try {
      let response;
      if (currentUser?.userRole === 'admin' || currentUser?.userRole === 'superadmin') {
        response = await teamService.getAll();
      } else {
        response = await teamService.getAll(currentUser?._id);
      }
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchPlayers = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (currentUser?.userRole === 'admin' || currentUser?.userRole === 'superadmin') {
        response = await playerService.getAll();
      } else {
        response = await playerService.getAll(currentUser?._id);
      }
      setPlayers(response.data);
    } catch (error) {
      setError('Failed to fetch players. Please try again.');
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setEditingPlayer(null);
    setNewPlayer(defaultPlayer);
    setOpen(true);
  };

  // When user clicks Add, check creation limits and either open dialog or show error
  const handleAddClick = () => {
    // If guest/viewer and reached limit, show error instead of opening dialog
    if ((currentUser?.userRole === 'guest' || currentUser?.userRole === 'viewer') && players.length >= 12) {
      setError('Guest users can only create up to 12 players');
      return;
    }
    handleOpen();
  };

  const handleClose = () => {
    setOpen(false);
    setNewPlayer(defaultPlayer);
    setEditingPlayer(null);
    setError(null);
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    // Handle teams properly - extract IDs from populated objects or use existing IDs
    const teamIds = player.teams ? player.teams.map(team => 
      typeof team === 'object' ? team._id : team
    ).filter(Boolean) : [];
    
    setNewPlayer({
      name: player.name,
      age: player.age,
      role: player.role,
      battingStyle: player.battingStyle,
      bowlingStyle: player.bowlingStyle,
      teams: teamIds
    });
    setOpen(true);
  };

  // Delete dialog handlers
  const handleDeleteClick = (player: Player) => {
    setPlayerToDelete(player);
    // Pre-check for conflicts before opening delete confirmation
    (async () => {
      try {
        const resp = await playerService.getConflicts(player._id!);
        const found = resp.data?.conflicts || [];
        if (found.length > 0) {
          setConflicts(found);
          setConflictDialogOpen(true);
        } else {
          setDeleteDialogOpen(true);
        }
      } catch (err) {
        // If pre-check fails, still open delete dialog to let server handle final check
        console.error('Error checking player conflicts:', err);
        setDeleteDialogOpen(true);
      }
    })();
  };

  const handleDeleteConfirm = async () => {
    if (!playerToDelete?._id) return;
    
    setLoading(true);
    setError(null);
    try {
      await playerService.delete(playerToDelete._id);
      fetchPlayers();
      setDeleteDialogOpen(false);
      setPlayerToDelete(null);
    } catch (error: any) {
      console.error('Error deleting player:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to delete player';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setPlayerToDelete(null);
  };

  const handleConflictDialogClose = () => {
    setConflictDialogOpen(false);
    setConflicts([]);
    setPlayerToDelete(null);
  };

  // Promote player to admin
  const handlePromoteToAdmin = async (playerId: string) => {
    if (!currentUser?._id) {
      setError('User not authenticated');
      return;
    }

    if (currentUser.userRole !== 'superadmin') {
      setError('Only superadmins can promote players');
      return;
    }

    setLoading(true);
    setError(null);
    try {
  // Promoting player (debug log removed)
  await playerService.promoteToAdmin(playerId, currentUser._id);
  fetchPlayers(); // Refresh the list to show updated roles
  setSuccess('Player promoted to admin successfully');
    } catch (error: any) {
      console.error('Error promoting player:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to promote player to admin';
      setError(`Failed to promote player: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Demote admin to player
  const handleDemoteFromAdmin = async (playerId: string) => {
    if (!currentUser?._id) {
      setError('User not authenticated');
      return;
    }

    if (currentUser.userRole !== 'superadmin') {
      setError('Only superadmins can demote admins');
      return;
    }

    setLoading(true);
    setError(null);
    try {
  // Demoting player (debug log removed)
  await playerService.demoteFromAdmin(playerId, currentUser._id);
  fetchPlayers(); // Refresh the list to show updated roles
  setSuccess('Admin demoted to player successfully');
    } catch (error: any) {
      console.error('Error demoting admin:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to demote admin';
      setError(`Failed to demote admin: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (continueAdding: boolean = false) => {
    if (!newPlayer.name || newPlayer.age <= 0) {
      setError('Please fill in all required fields correctly');
      return;
    }

    // If guest/viewer and reached limit, block create
    if ((currentUser?.userRole === 'guest' || currentUser?.userRole === 'viewer') && players.length >= 12) {
      setError('Guest users can only create up to 12 players');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (editingPlayer?._id) {
        // Create clean update data with just the fields we want to update
        const updateData = {
          name: newPlayer.name,
          age: newPlayer.age,
          role: newPlayer.role,
          battingStyle: newPlayer.battingStyle,
          bowlingStyle: newPlayer.bowlingStyle,
          teams: newPlayer.teams
        };
        await playerService.update(editingPlayer._id, updateData as Player);

        if (continueAdding) {
          // After saving edits, reset to create mode
          setEditingPlayer(null);
          setNewPlayer(defaultPlayer);
          // keep dialog open for next create
        } else {
          handleClose();
        }
      } else {
        await playerService.create(newPlayer);

        if (continueAdding) {
          // Clear form for next create but keep dialog open
          setNewPlayer(defaultPlayer);
          // Show transient success snackbar for Create & Continue
          setSuccess('Player created');
        } else {
          handleClose();
        }
      }

      // Refresh list after create/update
      fetchPlayers();
    } catch (error: any) {
      console.error('Error saving player:', error);
      const server = error?.response?.data;
      if (server && server.message) {
        if (server.limit !== undefined) {
          setError(`${server.message} (limit: ${server.limit}, you have: ${server.currentCount || 0})`);
        } else {
          setError(server.message);
        }
      } else {
        setError(editingPlayer ? 'Failed to update player' : 'Failed to create player');
      }
    } finally {
      setLoading(false);
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
              Players
            </Typography>
            {/* Show tooltip when limit reached */}
            {((currentUser?.userRole === 'guest' || currentUser?.userRole === 'viewer') && players.length >= 12) ? (
              <Tooltip title="Guest users can only create up to 12 players" arrow>
                <span>
                  <Button
                    variant="contained"
                    onClick={handleAddClick}
                    disabled={loading}
                    startIcon={<AddIcon />}
                  >
                    Add Player
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
                Add Player
              </Button>
            )}
            {(currentUser?.userRole === 'guest' || currentUser?.userRole === 'viewer') && players.length >= 12 && (
              <Typography variant="caption" color="error" sx={{ ml: 2 }}>
                Guest users can only create up to 12 players.
              </Typography>
            )}
          </Box>
        </Paper>
      )}

      {/* Floating Action Button for Mobile */}
      {isMobile && (
        <Fab 
          aria-label="add player"
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
          {players.map((player) => (
            <Card key={player._id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="h2">
                    {player.name}
                  </Typography>
                  <Chip 
                    label={player.role} 
                    color="primary" 
                    size="small"
                  />
                </Box>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Age:</Typography>
                    <Typography variant="body2">{player.age}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Batting:</Typography>
                    <Typography variant="body2">{player.battingStyle}</Typography>
                  </Box>
                  {player.bowlingStyle && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Bowling:</Typography>
                      <Typography variant="body2">{player.bowlingStyle}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Team:</Typography>
                    <Typography variant="body2">
                      {player.teams && player.teams.length > 0 ? (
                        player.teams.map(team => 
                          typeof team === 'object' && team.name ? team.name : 
                          typeof team === 'string' ? teams.find(t => t._id === team)?.name || 'Unknown' : 'Unknown'
                        ).join(', ')
                      ) : 'No Team'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">User Role:</Typography>
                    <Chip 
                      label={player.userRole || 'player'} 
                      color={
                        player.userRole === 'superadmin' ? 'error' :
                        player.userRole === 'admin' ? 'warning' :
                        player.userRole === 'viewer' ? 'info' : 'default'
                      }
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Stack>
              </CardContent>
              <CardActions>
                <Button
                  onClick={() => handleEdit(player)}
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
                  onClick={() => handleDeleteClick(player)}
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
                {currentUser?.userRole === 'superadmin' && player.userRole === 'player' && (
                  <Button
                    onClick={() => handlePromoteToAdmin(player._id!)}
                    color="success"
                    size="small"
                    sx={{ 
                      minWidth: isMobile ? '40px' : 'auto',
                      px: isMobile ? 1 : 2 
                    }}
                  >
                    {isMobile ? <PersonAddIcon /> : (
                      <>
                        <PersonAddIcon sx={{ mr: 1 }} />
                        Promote
                      </>
                    )}
                  </Button>
                )}
                {currentUser?.userRole === 'superadmin' && player.userRole === 'admin' && (
                  <Button
                    onClick={() => handleDemoteFromAdmin(player._id!)}
                    color="warning"
                    size="small"
                    sx={{ 
                      minWidth: isMobile ? '40px' : 'auto',
                      px: isMobile ? 1 : 2 
                    }}
                  >
                    {isMobile ? <PersonRemoveIcon /> : (
                      <>
                        <PersonRemoveIcon sx={{ mr: 1 }} />
                        Demote
                      </>
                    )}
                  </Button>
                )}
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
                <TableCell>Age</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Batting Style</TableCell>
                <TableCell>Bowling Style</TableCell>
                <TableCell>Team</TableCell>
                <TableCell>User Role</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {players.map((player) => (
                <TableRow key={player._id}>
                  <TableCell>{player.name}</TableCell>
                  <TableCell>{player.age}</TableCell>
                  <TableCell>{player.role}</TableCell>
                  <TableCell>{player.battingStyle}</TableCell>
                  <TableCell>{player.bowlingStyle}</TableCell>
                  <TableCell>
                    {player.teams && player.teams.length > 0 ? (
                      player.teams.map(team => 
                        typeof team === 'object' && team.name ? team.name : 
                        typeof team === 'string' ? teams.find(t => t._id === team)?.name || 'Unknown' : 'Unknown'
                      ).join(', ')
                    ) : 'No Team'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={player.userRole || 'player'} 
                      color={
                        player.userRole === 'superadmin' ? 'error' :
                        player.userRole === 'admin' ? 'warning' :
                        player.userRole === 'viewer' ? 'info' : 'default'
                      }
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleEdit(player)}
                      color="primary"
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDeleteClick(player)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                    {currentUser?.userRole === 'superadmin' && player.userRole === 'player' && (
                      <IconButton
                        onClick={() => handlePromoteToAdmin(player._id!)}
                        color="success"
                        size="small"
                        title="Promote to Admin"
                      >
                        <PersonAddIcon />
                      </IconButton>
                    )}
                    {currentUser?.userRole === 'superadmin' && player.userRole === 'admin' && (
                      <IconButton
                        onClick={() => handleDemoteFromAdmin(player._id!)}
                        color="warning"
                        size="small"
                        title="Demote to Player"
                      >
                        <PersonRemoveIcon />
                      </IconButton>
                    )}
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
          {editingPlayer ? 'Edit Player' : 'Create New Player'}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2} sx={{ mt: 2, minWidth: { xs: 'auto', sm: 400 } }}>
            <TextField
              label="Name"
              value={newPlayer.name}
              onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
              fullWidth
              required
              error={!newPlayer.name && error != null}
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
            <TextField
              label="Age"
              type="number"
              value={newPlayer.age}
              onChange={(e) => setNewPlayer({ ...newPlayer, age: parseInt(e.target.value) || 0 })}
              fullWidth
              required
              error={newPlayer.age <= 0 && error != null}
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
            <Autocomplete
              fullWidth
              options={[
                { value: 'batsman', label: 'Batsman' },
                { value: 'bowler', label: 'Bowler' },
                { value: 'all-rounder', label: 'All-Rounder' }
              ]}
              getOptionLabel={(option) => option.label}
              value={{ value: newPlayer.role, label: newPlayer.role === 'batsman' ? 'Batsman' : newPlayer.role === 'bowler' ? 'Bowler' : 'All-Rounder' }}
              onChange={(event, newValue) => {
                if (newValue) {
                  setNewPlayer({ ...newPlayer, role: newValue.value as Player['role'] });
                }
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Role"
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
                  <Typography>{option.label}</Typography>
                </Box>
              )}
            />
            <Autocomplete
              fullWidth
              options={[
                { value: 'right-handed', label: 'Right Handed' },
                { value: 'left-handed', label: 'Left Handed' }
              ]}
              getOptionLabel={(option) => option.label}
              value={{ value: newPlayer.battingStyle, label: newPlayer.battingStyle === 'right-handed' ? 'Right Handed' : 'Left Handed' }}
              onChange={(event, newValue) => {
                if (newValue) {
                  setNewPlayer({ ...newPlayer, battingStyle: newValue.value as 'right-handed' | 'left-handed' });
                }
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Batting Style"
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
                  <Typography>{option.label}</Typography>
                </Box>
              )}
            />
            <TextField
              label="Bowling Style"
              value={newPlayer.bowlingStyle}
              onChange={(e) => setNewPlayer({ ...newPlayer, bowlingStyle: e.target.value })}
              fullWidth
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
            <Autocomplete
              fullWidth
              options={[{ _id: '', name: 'No Team' }, ...teams]}
              getOptionLabel={(option) => option.name}
              value={teams.find(team => team._id === (newPlayer.teams?.[0] || '')) || { _id: '', name: 'No Team' }}
              onChange={(event, newValue) => {
                if (newValue) {
                  setNewPlayer({ 
                    ...newPlayer, 
                    teams: newValue._id ? [newValue._id] : [] 
                  });
                }
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Team"
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
          {!editingPlayer && (
            <Button
              onClick={() => handleSubmit(true)}
              variant="contained"
              disabled={loading || !newPlayer.name || newPlayer.age <= 0 || ((currentUser?.userRole === 'guest' || currentUser?.userRole === 'viewer') && players.length >= 12)}
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
              {loading ? <CircularProgress size={20} /> : 'Create & Continue'}
            </Button>
          )}

          <Button 
            onClick={() => handleSubmit(false)} 
            variant="contained" 
            disabled={loading || !newPlayer.name || newPlayer.age <= 0}
            size={isMobile ? "small" : "medium"}
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
            {loading ? <CircularProgress size={24} /> : (editingPlayer ? 'Save' : 'Create')}
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
          ⚠️ Delete Player?
        </DialogTitle>
        <DialogContent sx={{ py: isMobile ? 1 : 2 }}>
          <Typography variant="body1">
            Are you sure you want to delete <strong>"{playerToDelete?.name}"</strong>?
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
              'Delete Player'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Conflict Dialog (shown when pre-check finds matches referencing player's teams) */}
      <Dialog
        open={conflictDialogOpen}
        onClose={handleConflictDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'warning.main', fontWeight: 'bold' }}>Cannot delete player</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            This player cannot be deleted because they belong to a team that is referenced by the following match(es):
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

export default PlayerList;