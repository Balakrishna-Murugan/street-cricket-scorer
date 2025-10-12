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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Stack,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [newPlayer, setNewPlayer] = useState<Omit<Player, '_id'>>(defaultPlayer);

  useEffect(() => {
    fetchPlayers();
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await teamService.getAll();
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchPlayers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await playerService.getAll();
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

  const handleClose = () => {
    setOpen(false);
    setNewPlayer(defaultPlayer);
    setEditingPlayer(null);
    setError(null);
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setNewPlayer({
      name: player.name,
      age: player.age,
      role: player.role,
      battingStyle: player.battingStyle,
      bowlingStyle: player.bowlingStyle,
      teams: player.teams || []
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await playerService.delete(id);
      fetchPlayers();
    } catch (error) {
      setError('Failed to delete player');
      console.error('Error deleting player:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newPlayer.name || newPlayer.age <= 0) {
      setError('Please fill in all required fields correctly');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (editingPlayer?._id) {
        await playerService.update(editingPlayer._id, { ...editingPlayer, ...newPlayer });
      } else {
        await playerService.create(newPlayer);
      }
      handleClose();
      fetchPlayers();
    } catch (error) {
      setError(editingPlayer ? 'Failed to update player' : 'Failed to create player');
      console.error('Error saving player:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Players</Typography>
        <Button variant="contained" color="primary" onClick={handleOpen}>
          Add Player
        </Button>
      </Box>

      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Age</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Batting Style</TableCell>
                <TableCell>Bowling Style</TableCell>
                <TableCell>Team</TableCell>
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
                      typeof player.teams[0] === 'object' ? player.teams[0].name : 
                      teams.find(t => t._id === player.teams![0])?.name || 'Unknown'
                    ) : 'No Team'}
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
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this player?')) {
                          handleDelete(player._id!);
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
        )}
      </TableContainer>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editingPlayer ? 'Edit Player' : 'Create New Player'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2, minWidth: 400 }}>
            <TextField
              label="Name"
              value={newPlayer.name}
              onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
              fullWidth
              required
              error={!newPlayer.name && error != null}
            />
            <TextField
              label="Age"
              type="number"
              value={newPlayer.age}
              onChange={(e) => setNewPlayer({ ...newPlayer, age: parseInt(e.target.value) || 0 })}
              fullWidth
              required
              error={newPlayer.age <= 0 && error != null}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={newPlayer.role}
                label="Role"
                onChange={(e) => setNewPlayer({ ...newPlayer, role: e.target.value as Player['role'] })}
              >
                <MenuItem value="batsman">Batsman</MenuItem>
                <MenuItem value="bowler">Bowler</MenuItem>
                <MenuItem value="all-rounder">All-Rounder</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Batting Style</InputLabel>
              <Select
                value={newPlayer.battingStyle}
                label="Batting Style"
                onChange={(e) => setNewPlayer({ ...newPlayer, battingStyle: e.target.value as 'right-handed' | 'left-handed' })}
              >
                <MenuItem value="right-handed">Right Handed</MenuItem>
                <MenuItem value="left-handed">Left Handed</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Bowling Style"
              value={newPlayer.bowlingStyle}
              onChange={(e) => setNewPlayer({ ...newPlayer, bowlingStyle: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Team</InputLabel>
              <Select
                value={newPlayer.teams?.[0] || ''}
                label="Team"
                onChange={(e) => setNewPlayer({ 
                  ...newPlayer, 
                  teams: e.target.value ? [e.target.value as string] : [] 
                })}
              >
                <MenuItem value="">No Team</MenuItem>
                {teams.map((team) => (
                  <MenuItem key={team._id} value={team._id}>
                    {team.name}
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
            disabled={loading || !newPlayer.name || newPlayer.age <= 0}
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
    </Box>
  );
};

export default PlayerList;