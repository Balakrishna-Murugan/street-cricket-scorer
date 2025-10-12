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
  Chip,
  Stack
} from '@mui/material';
import { Match, Team } from '../types';
import { matchService, teamService } from '../services/api.service';
import { useNavigate } from 'react-router-dom';

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
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);
  const [newMatch, setNewMatch] = useState<Omit<Match, '_id'>>(defaultMatch);

  // Get user role for permissions
  const userRole = localStorage.getItem('userRole') || 'viewer';
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    fetchMatches();
    fetchTeams();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await matchService.getAll();
      setMatches(response.data);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await teamService.getAll();
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleSubmit = async () => {
    try {
      // Create match with properly configured innings based on toss
      const matchToCreate = { ...newMatch };
      
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
    <div>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">
          {isAdmin ? 'Matches' : 'View Matches'}
        </Typography>
        {isAdmin && (
          <Button variant="contained" color="primary" onClick={handleOpen}>
            Add Match
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Teams</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Overs</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Result</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {matches.map((match) => (
              <TableRow key={match._id}>
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
                      onClick={() => navigate(`/matches/${match._id}/summary`)}
                    >
                      View Summary
                    </Button>
                    {isAdmin && match.status === 'upcoming' && (
                      <Button 
                        color="success" 
                        size="small"
                        variant="contained"
                        onClick={() => navigate(`/matches/${match._id}/live`)}
                      >
                        Start Match
                      </Button>
                    )}
                    {isAdmin && match.status === 'in-progress' && (
                      <Button 
                        color="secondary" 
                        size="small"
                        variant="contained"
                        onClick={() => navigate(`/matches/${match._id}/live`)}
                      >
                        Continue Match
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Add New Match</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Team 1</InputLabel>
            <Select
              value={newMatch.team1}
              onChange={(e) => setNewMatch({ ...newMatch, team1: e.target.value })}
            >
              {teams.map((team) => (
                <MenuItem key={team._id} value={team._id}>
                  {team.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Team 2</InputLabel>
            <Select
              value={newMatch.team2}
              onChange={(e) => setNewMatch({ ...newMatch, team2: e.target.value })}
            >
              {teams.map((team) => (
                <MenuItem key={team._id} value={team._id}>
                  {team.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Number of Overs"
            type="number"
            fullWidth
            value={newMatch.overs}
            onChange={(e) => setNewMatch({ ...newMatch, overs: Number(e.target.value) })}
          />
          <TextField
            margin="dense"
            label="Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={new Date(newMatch.date).toISOString().split('T')[0]}
            onChange={(e) => setNewMatch({ ...newMatch, date: new Date(e.target.value).toISOString() })}
          />
          <TextField
            margin="dense"
            label="Venue"
            fullWidth
            value={newMatch.venue}
            onChange={(e) => setNewMatch({ ...newMatch, venue: e.target.value })}
          />
          
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            🏏 Toss Information
          </Typography>
          
          <FormControl fullWidth margin="dense">
            <InputLabel>Toss Winner</InputLabel>
            <Select
              value={newMatch.tossWinner || ''}
              onChange={(e) => setNewMatch({ ...newMatch, tossWinner: e.target.value })}
            >
              {teams.map((team) => (
                <MenuItem key={team._id} value={team._id}>
                  {team.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth margin="dense">
            <InputLabel>Toss Decision</InputLabel>
            <Select
              value={newMatch.tossDecision || ''}
              onChange={(e) => setNewMatch({ ...newMatch, tossDecision: e.target.value as 'bat' | 'bowl' })}
              disabled={!newMatch.tossWinner}
            >
              <MenuItem value="bat">Chose to Bat First</MenuItem>
              <MenuItem value="bowl">Chose to Bowl First</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default MatchList;