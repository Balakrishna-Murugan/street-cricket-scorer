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
  Stack,
  Card,
  CardContent,
  CardActions,
  Container,
  useTheme,
  useMediaQuery
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [newMatch, setNewMatch] = useState<Omit<Match, '_id'>>(defaultMatch);
  const [editMatch, setEditMatch] = useState<Match | null>(null);

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
  
  const handleEditOpen = (match: Match) => {
    setEditMatch(match);
    setEditOpen(true);
  };
  
  const handleEditClose = () => {
    setEditOpen(false);
    setEditMatch(null);
  };

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

  const handleEditSubmit = async () => {
    try {
      if (!editMatch) return;
      
      // Update match with edited values
      const updatedMatch = { ...editMatch };
      
      // Reconfigure innings if toss info changed
      if (updatedMatch.tossWinner && updatedMatch.tossDecision) {
        let battingTeam: string;
        let bowlingTeam: string;
        
        const tossWinnerId = typeof updatedMatch.tossWinner === 'string' ? updatedMatch.tossWinner : updatedMatch.tossWinner._id;
        const team1Id = typeof updatedMatch.team1 === 'string' ? updatedMatch.team1 : updatedMatch.team1._id;
        const team2Id = typeof updatedMatch.team2 === 'string' ? updatedMatch.team2 : updatedMatch.team2._id;
        
        if (updatedMatch.tossDecision === 'bat') {
          battingTeam = tossWinnerId;
          bowlingTeam = tossWinnerId === team1Id ? team2Id : team1Id;
        } else {
          bowlingTeam = tossWinnerId;
          battingTeam = tossWinnerId === team1Id ? team2Id : team1Id;
        }
        
        // Update innings team assignments
        if (updatedMatch.innings && updatedMatch.innings.length > 0) {
          updatedMatch.innings[0].battingTeam = battingTeam;
          updatedMatch.innings[0].bowlingTeam = bowlingTeam;
          
          if (updatedMatch.innings.length > 1) {
            updatedMatch.innings[1].battingTeam = bowlingTeam;
            updatedMatch.innings[1].bowlingTeam = battingTeam;
          }
        }
      }
      
      await matchService.update(editMatch._id!, updatedMatch);
      handleEditClose();
      fetchMatches();
    } catch (error) {
      console.error('Error updating match:', error);
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
    <Container maxWidth="lg">
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

      {isMobile ? (
        // Mobile Card Layout
        <Stack spacing={2}>
          {matches.map((match) => (
            <Card 
              key={match._id}
              elevation={3}
              sx={{ 
                borderRadius: 2,
                border: '1px solid rgba(0,0,0,0.1)'
              }}
            >
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
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
                  <Stack direction="column" spacing={1} sx={{ width: '100%' }}>
                    <Button 
                      color="primary" 
                      size="medium"
                      variant="outlined"
                      fullWidth
                      onClick={() => navigate(`/matches/${match._id}/summary`)}
                    >
                      View Summary
                    </Button>
                    {isAdmin && match.status === 'upcoming' && (
                      <Button 
                        color="info" 
                        size="medium"
                        variant="outlined"
                        fullWidth
                        onClick={() => handleEditOpen(match)}
                      >
                        Edit Match
                      </Button>
                    )}
                    {isAdmin && match.status === 'upcoming' && (
                      <Button 
                        color="success" 
                        size="medium"
                        variant="contained"
                        fullWidth
                        onClick={() => navigate(`/matches/${match._id}/live`)}
                      >
                        Start Match
                      </Button>
                    )}
                    {isAdmin && match.status === 'in-progress' && (
                      <Button 
                        color="secondary" 
                        size="medium"
                        variant="contained"
                        fullWidth
                        onClick={() => navigate(`/matches/${match._id}/live`)}
                      >
                        Continue Match
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
      )}

      <Dialog 
        open={open} 
        onClose={handleClose}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Match</DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
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
              disabled={!newMatch.team1 || !newMatch.team2}
            >
              {/* Only show Team 1 and Team 2 in toss dropdown */}
              {teams.filter(team => 
                team._id === newMatch.team1 || team._id === newMatch.team2
              ).map((team) => (
                <MenuItem key={team._id} value={team._id}>
                  {team.name} {team._id === newMatch.team1 ? '(Team 1)' : '(Team 2)'}
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

      {/* Edit Match Dialog */}
      <Dialog 
        open={editOpen} 
        onClose={handleEditClose}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Match</DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          {editMatch && (
            <>
              <FormControl fullWidth margin="dense">
                <InputLabel>Team 1</InputLabel>
                <Select
                  value={typeof editMatch.team1 === 'string' ? editMatch.team1 : editMatch.team1._id}
                  onChange={(e) => setEditMatch({ ...editMatch, team1: e.target.value })}
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
                  value={typeof editMatch.team2 === 'string' ? editMatch.team2 : editMatch.team2._id}
                  onChange={(e) => setEditMatch({ ...editMatch, team2: e.target.value })}
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
                value={editMatch.overs}
                onChange={(e) => setEditMatch({ ...editMatch, overs: Number(e.target.value) })}
              />
              <TextField
                margin="dense"
                label="Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={new Date(editMatch.date).toISOString().split('T')[0]}
                onChange={(e) => setEditMatch({ ...editMatch, date: new Date(e.target.value).toISOString() })}
              />
              <TextField
                margin="dense"
                label="Venue"
                fullWidth
                value={editMatch.venue}
                onChange={(e) => setEditMatch({ ...editMatch, venue: e.target.value })}
              />
              
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                🏏 Toss Information
              </Typography>
              
              <FormControl fullWidth margin="dense">
                <InputLabel>Toss Winner</InputLabel>
                <Select
                  value={editMatch.tossWinner || ''}
                  onChange={(e) => setEditMatch({ ...editMatch, tossWinner: e.target.value })}
                >
                  {/* Only show Team 1 and Team 2 in toss dropdown */}
                  {teams.filter(team => {
                    const team1Id = typeof editMatch.team1 === 'string' ? editMatch.team1 : editMatch.team1._id;
                    const team2Id = typeof editMatch.team2 === 'string' ? editMatch.team2 : editMatch.team2._id;
                    return team._id === team1Id || team._id === team2Id;
                  }).map((team) => {
                    const team1Id = typeof editMatch.team1 === 'string' ? editMatch.team1 : editMatch.team1._id;
                    return (
                      <MenuItem key={team._id} value={team._id}>
                        {team.name} {team._id === team1Id ? '(Team 1)' : '(Team 2)'}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="dense">
                <InputLabel>Toss Decision</InputLabel>
                <Select
                  value={editMatch.tossDecision || ''}
                  onChange={(e) => setEditMatch({ ...editMatch, tossDecision: e.target.value as 'bat' | 'bowl' })}
                  disabled={!editMatch.tossWinner}
                >
                  <MenuItem value="bat">Chose to Bat First</MenuItem>
                  <MenuItem value="bowl">Chose to Bowl First</MenuItem>
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MatchList;