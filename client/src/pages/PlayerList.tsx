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
  CircularProgress,
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
    <Container maxWidth="lg" sx={{ p: { xs: 1, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Players</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleOpen}
          size={isMobile ? "small" : "medium"}
        >
          Add Player
        </Button>
      </Box>

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
                        typeof player.teams[0] === 'object' ? player.teams[0].name : 
                        teams.find(t => t._id === player.teams![0])?.name || 'Unknown'
                      ) : 'No Team'}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
              <CardActions>
                <Button
                  onClick={() => handleEdit(player)}
                  color="primary"
                  size="small"
                  startIcon={<EditIcon />}
                >
                  Edit
                </Button>
                <Button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this player?')) {
                      handleDelete(player._id!);
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
        </TableContainer>
      )}

      <Dialog 
        open={open} 
        onClose={handleClose}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingPlayer ? 'Edit Player' : 'Create New Player'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2, minWidth: { xs: 'auto', sm: 400 } }}>
            <TextField
              label="Name"
              value={newPlayer.name}
              onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
              fullWidth
              required
              error={!newPlayer.name && error != null}
              size={isMobile ? "small" : "medium"}
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
            />
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
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
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
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
              size={isMobile ? "small" : "medium"}
            />
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
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
            disabled={loading || !newPlayer.name || newPlayer.age <= 0}
            size={isMobile ? "small" : "medium"}
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
    </Container>
  );
};

export default PlayerList;