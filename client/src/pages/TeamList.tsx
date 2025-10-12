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
  Select,
  MenuItem,
  FormControl,
  Card,
  CardContent,
  CardActions,
  Container,
  useTheme,
  useMediaQuery,
  Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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

  const handleDelete = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await teamService.delete(id);
      fetchTeams();
    } catch (error) {
      setError('Failed to delete team');
      console.error('Error deleting team:', error);
    } finally {
      setLoading(false);
    }
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
    <Container maxWidth="lg" sx={{ p: { xs: 1, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Teams</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleOpen}
          disabled={loading}
          size={isMobile ? "small" : "medium"}
        >
          Add Team
        </Button>
      </Box>

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
                      {typeof team.captain === 'object' ? team.captain.name : team.captain || 'No Captain'}
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
                  startIcon={<EditIcon />}
                >
                  Edit
                </Button>
                <Button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this team?')) {
                      handleDelete(team._id!);
                    }
                  }}
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                >
                  Delete
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
                  <TableCell>{typeof team.captain === 'object' ? team.captain.name : team.captain}</TableCell>
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
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this team?')) {
                          handleDelete(team._id!);
                        }
                      }}
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
          <Stack spacing={2} sx={{ mt: 2, minWidth: 400 }}>
            <TextField
              label="Team Name"
              value={newTeam.name}
              onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
              fullWidth
              required
              error={!newTeam.name && error != null}
            />
            <FormControl fullWidth>
              <Select
                value={newTeam.captain === undefined || newTeam.captain === 'undefined' || newTeam.captain === null ? '' : newTeam.captain}
                onChange={(e) => {
                  const value = e.target.value as string;
                  console.log('Captain selection changed to:', value); // Debug log
                  setNewTeam({ ...newTeam, captain: value });
                }}
                displayEmpty
                sx={{ minWidth: 120 }}
                renderValue={(selected) => {
                  if (!selected || selected === '') {
                    return <span style={{ color: '#999' }}>Select Captain (Optional)</span>;
                  }
                  const selectedPlayer = players.find(p => p._id === selected);
                  return selectedPlayer ? selectedPlayer.name : selected;
                }}
              >
                <MenuItem value="">
                  <em>No Captain</em>
                </MenuItem>
                {players.map((player) => (
                  <MenuItem key={player._id} value={player._id || ''}>
                    {player.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={loading || !newTeam.name}
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
    </Container>
  );
};

export default TeamList;