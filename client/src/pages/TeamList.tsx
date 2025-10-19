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
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [newTeam, setNewTeam] = useState<TeamFormData>(defaultTeam);
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  useEffect(() => {
    fetchTeams();
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await playerService.getAll();
      // Filter out players without _id to ensure type safety
      const validPlayers = response.data.filter((player: Player) => player._id);
      setPlayers(validPlayers);
    } catch (error) {
      console.error('Error fetching players:', error);
      setError('Failed to fetch players');
    }
  };

  const fetchTeams = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await teamService.getAll();
      setTeams(response.data);
    } catch (error) {
      setError('Failed to fetch teams. Please try again.');
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setEditingTeam(null);
    setNewTeam(defaultTeam);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setNewTeam(defaultTeam);
    setEditingTeam(null);
    setError(null);
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
  };

  // Delete dialog handlers
  const handleDeleteClick = (team: Team) => {
    setTeamToDelete(team);
    setDeleteDialogOpen(true);
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
    } catch (error) {
      setError('Failed to delete team');
      console.error('Error deleting team:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setTeamToDelete(null);
  };

  const handleSubmit = async () => {
    console.log('Form submission started with newTeam:', newTeam); // Debug log
    
    if (!newTeam.name) {
      setError('Please fill in team name');
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
      console.log('Captain value before processing:', `"${newTeam.captain}"`); // Debug log
      if (newTeam.captain && 
          newTeam.captain.trim() !== '' && 
          newTeam.captain !== 'undefined' && 
          newTeam.captain !== 'null') {
        teamData.captain = newTeam.captain.trim();
        console.log('Captain added to teamData:', teamData.captain); // Debug log
      } else {
        console.log('No captain selected, captain field omitted'); // Debug log
      }
      
      console.log('Sending team data:', JSON.stringify(teamData, null, 2)); // Better debug log
      
      if (editingTeam?._id) {
        await teamService.update(editingTeam._id, teamData);
      } else {
        await teamService.create(teamData);
      }
      handleClose();
      fetchTeams();
    } catch (error: any) {
      console.error('Error saving team:', error); // Debug log
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      setError(editingTeam ? `Failed to update team: ${errorMessage}` : `Failed to create team: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: isMobile ? 2 : 3, px: { xs: 1, sm: 3 } }}>
      {!isMobile && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3
        }}>
          <Typography variant="h5">Teams</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleOpen}
            disabled={loading}
            startIcon={<AddIcon />}
          >
            Add Team
          </Button>
        </Box>
      )}

      {/* Floating Action Button for Mobile */}
      {isMobile && (
        <Fab 
          aria-label="add team"
          onClick={handleOpen}
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
      >
        <DialogTitle>{editingTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2, minWidth: { xs: 'auto', sm: 400 } }}>
            <TextField
              label="Team Name"
              value={newTeam.name}
              onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
              fullWidth
              required
              error={!newTeam.name && error != null}
              size={isMobile ? "small" : "medium"}
            />
            <Autocomplete
              fullWidth
              options={[{ _id: '', name: 'No Captain' }, ...players]}
              getOptionLabel={(option) => option.name}
              value={players.find(p => p._id === newTeam.captain) || { _id: '', name: 'No Captain' }}
              onChange={(event, newValue) => {
                const value = newValue?._id || '';
                console.log('Captain selection changed to:', value); // Debug log
                setNewTeam({ ...newTeam, captain: value });
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Captain (Optional)"
                  size={isMobile ? "small" : "medium"}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Typography>{option.name}</Typography>
                </Box>
              )}
            />
            
            <Autocomplete
              multiple
              fullWidth
              options={players}
              getOptionLabel={(option) => `${option.name} - ${option.role}`}
              value={players.filter(player => newTeam.members.includes(player._id || ''))}
              onChange={(event, newValue) => {
                const memberIds = newValue.map(player => player._id || '').filter(id => id);
                setNewTeam({ ...newTeam, members: memberIds });
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Team Members (Optional)"
                  placeholder={newTeam.members.length === 0 ? "Select Team Members" : ""}
                  size={isMobile ? "small" : "medium"}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Typography>{option.name} - {option.role}</Typography>
                </Box>
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option.name}
                    size="small"
                    {...getTagProps({ index })}
                    key={option._id}
                  />
                ))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 2, sm: 1 } }}>
          <Button 
            onClick={handleClose}
            size={isMobile ? "small" : "medium"}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={loading || !newTeam.name}
            size={isMobile ? "small" : "medium"}
          >
            {loading ? <CircularProgress size={24} /> : editingTeam ? 'Save' : 'Create'}
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
          px: isMobile ? 2 : 3,
          py: isMobile ? 1.5 : 2,
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
    </Container>
  );
};

export default TeamList;