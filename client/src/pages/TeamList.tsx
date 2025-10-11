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
  CircularProgress
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Team } from '../types';
import { teamService } from '../services/api.service';

const defaultTeam: Omit<Team, '_id'> = {
  name: '',
  captain: '',
  members: []
};

const TeamList: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [newTeam, setNewTeam] = useState<Omit<Team, '_id'>>(defaultTeam);

  useEffect(() => {
    fetchTeams();
  }, []);

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
    if (!newTeam.name || !newTeam.captain) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (editingTeam?._id) {
        await teamService.update(editingTeam._id, { ...editingTeam, ...newTeam });
      } else {
        await teamService.create(newTeam);
      }
      handleClose();
      fetchTeams();
    } catch (error) {
      setError(editingTeam ? 'Failed to update team' : 'Failed to create team');
      console.error('Error saving team:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Teams</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleOpen}
          disabled={loading}
        >
          Add Team
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
                <TableCell>Captain</TableCell>
                <TableCell>Members</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team._id}>
                  <TableCell>{team.name}</TableCell>
                  <TableCell>{team.captain}</TableCell>
                  <TableCell>{team.members.length}</TableCell>
                  <TableCell>
                    <IconButton 
                      onClick={handleOpen}
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
        )}
      </TableContainer>

      <Dialog open={open} onClose={handleClose}>
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
            <TextField
              label="Captain"
              value={newTeam.captain}
              onChange={(e) => setNewTeam({ ...newTeam, captain: e.target.value })}
              fullWidth
              required
              error={!newTeam.captain && error != null}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={loading || !newTeam.name || !newTeam.captain}
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
    </Box>
  );
};

export default TeamList;