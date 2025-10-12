import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Match, Player, BallOutcome } from '../types';
import { matchService, playerService } from '../services/api.service';
import MatchDetails from '../components/MatchDetails';
import {
  Box,
  Paper,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  SelectChangeEvent,
} from '@mui/material';

interface Props {}

const LiveScoring: React.FC<Props> = () => {
  const { matchId } = useParams();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentInnings] = useState<number>(0);
  const [striker, setStriker] = useState<string>('');
  const [nonStriker, setNonStriker] = useState<string>('');
  const [bowler, setBowler] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [isWicketDialogOpen, setIsWicketDialogOpen] = useState(false);
  const [currentOverBalls, setCurrentOverBalls] = useState<BallOutcome[]>([]);
  const [isOverInProgress, setIsOverInProgress] = useState(false);
  const [strikerStats, setStrikerStats] = useState<{ runs: number; balls: number }>({ runs: 0, balls: 0 });
  const [nonStrikerStats, setNonStrikerStats] = useState<{ runs: number; balls: number }>({ runs: 0, balls: 0 });
  const [bowlerStats, setBowlerStats] = useState<{ overs: number; runs: number; wickets: number }>({ overs: 0, runs: 0, wickets: 0 });

  const fetchPlayers = useCallback(async () => {
    try {
      const { data } = await playerService.getAll();
      console.log('Fetched players:', data);
      setPlayers(data);
    } catch (error) {
      setError('Error fetching players');
      console.error('Error:', error);
    }
  }, []);

  const fetchMatch = useCallback(async () => {
    try {
      if (!matchId) return;
      const { data } = await matchService.getById(matchId);
      setMatch(data);
      
      // Initialize striker, non-striker, and bowler if not set
      if (data && data.innings && data.innings.length > 0) {
        const currentInning = data.innings[currentInnings];
        if (!striker && currentInning.battingStats.length > 0) {
          setStriker(typeof currentInning.battingStats[0].player === 'string' 
            ? currentInning.battingStats[0].player 
            : currentInning.battingStats[0].player._id || '');
        }
        if (!nonStriker && currentInning.battingStats.length > 1) {
          setNonStriker(typeof currentInning.battingStats[1].player === 'string'
            ? currentInning.battingStats[1].player
            : currentInning.battingStats[1].player._id || '');
        }
        if (!bowler && currentInning.bowlingStats.length > 0) {
          setBowler(typeof currentInning.bowlingStats[0].player === 'string'
            ? currentInning.bowlingStats[0].player
            : currentInning.bowlingStats[0].player._id || '');
        }
      }
    } catch (error) {
      setError('Error fetching match details');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [matchId, currentInnings, striker, nonStriker, bowler]);

  useEffect(() => {
    fetchMatch();
    fetchPlayers();
  }, [fetchMatch, fetchPlayers]);

  const handleBallOutcome = async (runs: number, isExtra: boolean = false) => {
    if (!match || !matchId) return;

    if (!isOverInProgress) {
      setError('Please start a new over first');
      return;
    }

    const updatedMatch = { ...match };
    const currentInning = updatedMatch.innings[currentInnings];

    if (!isExtra) {
      // Update striker's stats
      const strikerBattingStats = currentInning.battingStats.find(
        (stat) => typeof stat.player === 'string' ? stat.player === striker : stat.player._id === striker
      );
      if (strikerBattingStats) {
        strikerBattingStats.runs += runs;
        strikerBattingStats.balls += 1;
        if (runs === 4) strikerBattingStats.fours += 1;
        if (runs === 6) strikerBattingStats.sixes += 1;
      }
      setStrikerStats(prev => ({
        runs: prev.runs + runs,
        balls: prev.balls + 1
      }));

      // Update bowler's stats
      const bowlerBowlingStats = currentInning.bowlingStats.find(
        (stat) => typeof stat.player === 'string' ? stat.player === bowler : stat.player._id === bowler
      );
      if (bowlerBowlingStats) {
        bowlerBowlingStats.runs += runs;
        // Increment balls properly
        const currentBalls = (bowlerBowlingStats.overs % 1) * 10;
        if (currentBalls === 5) {
          // Complete over
          bowlerBowlingStats.overs = Math.floor(bowlerBowlingStats.overs) + 1;
          setIsOverInProgress(false); // End the over
        } else {
          bowlerBowlingStats.overs = Math.floor(bowlerBowlingStats.overs) + ((currentBalls + 1) / 10);
        }
      }
      setBowlerStats(prev => {
        const currentBalls = (prev.overs % 1) * 10;
        const newOvers = currentBalls === 5 
          ? Math.floor(prev.overs) + 1 
          : Math.floor(prev.overs) + ((currentBalls + 1) / 10);
        return {
          overs: newOvers,
          runs: prev.runs + runs,
          wickets: prev.wickets
        };
      });

      currentInning.totalRuns += runs;
      currentInning.overs = Math.floor(currentInning.overs) + 0.1;

      // Rotate strike if odd runs
      if (runs % 2 === 1) {
        const temp = striker;
        setStriker(nonStriker);
        setNonStriker(temp);
        
        // Swap stats when rotating strike
        const tempStats = { ...strikerStats };
        setStrikerStats(nonStrikerStats);
        setNonStrikerStats(tempStats);
      }
    }

    try {
      const cleanMatchData = (match: Match): Match => {
        return {
          ...match,
          team1: typeof match.team1 === 'object' ? match.team1._id : match.team1,
          team2: typeof match.team2 === 'object' ? match.team2._id : match.team2,
          innings: match.innings.map(inning => ({
            battingTeam: typeof inning.battingTeam === 'object' ? inning.battingTeam._id : inning.battingTeam,
            bowlingTeam: typeof inning.bowlingTeam === 'object' ? inning.bowlingTeam._id : inning.bowlingTeam,
            totalRuns: inning.totalRuns,
            wickets: inning.wickets,
            overs: inning.overs,
            battingStats: inning.battingStats.map(stat => ({
              player: typeof stat.player === 'object' ? stat.player._id : stat.player,
              runs: stat.runs,
              balls: stat.balls,
              fours: stat.fours,
              sixes: stat.sixes,
              isOut: stat.isOut,
              dismissalType: stat.dismissalType
            })),
            bowlingStats: inning.bowlingStats.map(stat => ({
              player: typeof stat.player === 'object' ? stat.player._id : stat.player,
              overs: stat.overs,
              runs: stat.runs,
              wickets: stat.wickets,
              economy: stat.economy
            })),
            extras: inning.extras
          }))
        };
      };

      const cleanedMatch = cleanMatchData(updatedMatch);

      console.log('Sending update with data:', cleanedMatch);
      const { data } = await matchService.updateScore(matchId, cleanedMatch);
      console.log('Update response:', data);
      
      // Refresh match data to ensure we have the latest state
      await fetchMatch();
    } catch (error: any) {
      setError('Error updating match');
      console.error('Error updating match:', error?.response?.data || error?.message || error);
    }
  };

  const handleExtra = async (type: string, runs: number = 1) => {
    if (!match || !matchId) return;

    const updatedMatch = { ...match };
    const currentInning = updatedMatch.innings[currentInnings];

    switch (type) {
      case 'wide':
        currentInning.extras.wides += 1;
        currentInning.totalRuns += runs;
        break;
      case 'noBall':
        currentInning.extras.noBalls += 1;
        currentInning.totalRuns += runs;
        break;
      case 'bye':
        currentInning.extras.byes += runs;
        currentInning.totalRuns += runs;
        currentInning.overs = Math.floor(currentInning.overs) + 0.1;
        break;
      case 'legBye':
        currentInning.extras.legByes += runs;
        currentInning.totalRuns += runs;
        currentInning.overs = Math.floor(currentInning.overs) + 0.1;
        break;
    }

    try {
      await matchService.update(matchId, updatedMatch);
      setMatch(updatedMatch);
    } catch (error) {
      setError('Error updating extras');
      console.error('Error:', error);
    }
  };

  const handleWicket = async (type: string) => {
    if (!match || !matchId) return;

    const updatedMatch = { ...match };
    const currentInning = updatedMatch.innings[currentInnings];

    // Update batting stats
    const strikerStats = currentInning.battingStats.find(
      (stat) => (typeof stat.player === 'string' ? stat.player : stat.player._id) === striker
    );
    if (strikerStats) {
      strikerStats.isOut = true;
      strikerStats.dismissalType = type;
    }

    // Update bowling stats
    const bowlerStats = currentInning.bowlingStats.find(
      (stat) => (typeof stat.player === 'string' ? stat.player : stat.player._id) === bowler
    );
    if (bowlerStats) {
      bowlerStats.wickets += 1;
      bowlerStats.overs = Math.floor(bowlerStats.overs) + 0.1;
    }

    currentInning.wickets += 1;
    currentInning.overs = Math.floor(currentInning.overs) + 0.1;

    try {
      await matchService.update(matchId, updatedMatch);
      setMatch(updatedMatch);
      setIsWicketDialogOpen(false);
      // Reset striker selection
      setStriker('');
    } catch (error) {
      setError('Error recording wicket');
      console.error('Error:', error);
    }
  };

  const handleBatsmanChange = (event: SelectChangeEvent) => {
    setStriker(event.target.value);
  };

  const handleNonStrikerChange = (event: SelectChangeEvent) => {
    setNonStriker(event.target.value);
  };

  const handleBowlerChange = (event: SelectChangeEvent) => {
    setBowler(event.target.value);
  };

  const startNewOver = () => {
    if (!striker || !nonStriker || !bowler) {
      setError('Please select striker, non-striker, and bowler before starting the over');
      return;
    }
    if (striker === nonStriker) {
      setError('Striker and non-striker cannot be the same player');
      return;
    }
    setError(null);
    setCurrentOverBalls([]);
    setIsOverInProgress(true);
  };

  const resetOver = () => {
    setCurrentOverBalls([]);
    setIsOverInProgress(false);
    // Don't reset player selections
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!match) return <Typography>Match not found</Typography>;

  const currentInning = match.innings[currentInnings];
  const battingTeamId = typeof currentInning?.battingTeam === 'string' 
    ? currentInning.battingTeam 
    : currentInning?.battingTeam?._id;
  const bowlingTeamId = typeof currentInning?.bowlingTeam === 'string'
    ? currentInning.bowlingTeam
    : currentInning?.bowlingTeam?._id;

  console.log('Current inning:', currentInning);
  console.log('Batting team ID:', battingTeamId);
  console.log('Bowling team ID:', bowlingTeamId);
  console.log('Available players:', players);

  return (
    <Box p={3} component="div">
      <Typography variant="h4" gutterBottom>
        {`Live Scoring - ${typeof match.team1 === 'object' ? match.team1.name : match.team1} vs ${typeof match.team2 === 'object' ? match.team2.name : match.team2}`}
      </Typography>

      {/* Score Summary */}
      <Paper sx={{ p: 2, mb: 3 }} component="div">
          <MatchDetails
          totalRuns={currentInning?.totalRuns || 0}
          wickets={currentInning?.wickets || 0}
          overs={currentInning?.overs || 0}
          currentOverBalls={currentOverBalls}
          striker={striker}
          nonStriker={nonStriker}
          bowler={bowler}
          players={players}
          strikerStats={strikerStats}
          nonStrikerStats={nonStrikerStats}
          bowlerStats={{
            overs: bowlerStats.overs,
            runs: bowlerStats.runs,
            wickets: bowlerStats.wickets
          }}
        />
      </Paper>

      {/* Player Selection */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel>Striker</InputLabel>
          <Select value={striker} onChange={handleBatsmanChange}>
            {players
              .filter(player => {
                console.log('Checking player for striker:', player.name);
                console.log('Player teams:', JSON.stringify(player.teams));
                console.log('battingTeamId:', battingTeamId);
                if (!player.teams || !battingTeamId) return false;
                const teamIds = player.teams.map(team => 
                  typeof team === 'string' ? team : team._id
                );
                console.log('Team IDs after conversion:', teamIds);
                const hasTeam = teamIds.includes(String(battingTeamId));
                console.log('Has team:', hasTeam);
                return hasTeam;
              })
              .map((player) => (
                <MenuItem key={player._id} value={player._id}>
                  {player.name}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Non-Striker</InputLabel>
          <Select value={nonStriker} onChange={handleNonStrikerChange}>
            {players
              .filter(player => {
                console.log('Checking player for non-striker:', player.name);
                console.log('Player teams:', JSON.stringify(player.teams));
                console.log('battingTeamId:', battingTeamId);
                if (!player.teams || !battingTeamId) return false;
                const teamIds = player.teams.map(team => 
                  typeof team === 'string' ? team : team._id
                );
                console.log('Team IDs after conversion:', teamIds);
                const hasTeam = teamIds.includes(String(battingTeamId));
                console.log('Has team:', hasTeam);
                return hasTeam;
              })
              .map((player) => (
                <MenuItem key={player._id} value={player._id}>
                  {player.name}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Bowler</InputLabel>
          <Select value={bowler} onChange={handleBowlerChange}>
            {players
              .filter(player => {
                console.log('Checking player for bowler:', player.name);
                console.log('Player teams:', JSON.stringify(player.teams));
                console.log('bowlingTeamId:', bowlingTeamId);
                if (!player.teams || !bowlingTeamId) return false;
                const teamIds = player.teams.map(team => 
                  typeof team === 'string' ? team : team._id
                );
                console.log('Team IDs after conversion:', teamIds);
                const hasTeam = teamIds.includes(String(bowlingTeamId));
                console.log('Has team:', hasTeam);
                return hasTeam;
              })
              .map((player) => (
                <MenuItem key={player._id} value={player._id}>
                  {player.name}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      </Box>

      {/* Scoring Buttons */}
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2, mb: 3 }}>
        {[0, 1, 2, 3, 4, 6].map((runs) => (
          <Button key={runs} variant="contained" onClick={() => handleBallOutcome(runs)}>
            {runs}
          </Button>
        ))}
        <Button
          variant="contained"
          color="error"
          onClick={() => setIsWicketDialogOpen(true)}
        >
          W
        </Button>
      </Stack>

      {/* Extras Buttons */}
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Button variant="outlined" onClick={() => handleExtra('wide')}>
          Wide
        </Button>
        <Button variant="outlined" onClick={() => handleExtra('noBall')}>
          No Ball
        </Button>
        <Button variant="outlined" onClick={() => handleExtra('bye', 1)}>
          Bye
        </Button>
        <Button variant="outlined" onClick={() => handleExtra('legBye', 1)}>
          Leg Bye
        </Button>
      </Stack>

      {/* Over Management */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Over Management
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setIsOverInProgress(true)}
            disabled={isOverInProgress}
          >
            Start New Over
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setIsOverInProgress(false)}
            disabled={!isOverInProgress}
          >
            End Over
          </Button>
          <Typography variant="body1" sx={{ alignSelf: 'center' }}>
            Status: {isOverInProgress ? 'Over in progress' : 'Over not started'}
          </Typography>
        </Stack>
      </Box>

      {/* Batting Scorecard */}
      <Typography variant="h6" gutterBottom>
        Batting
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Batter</TableCell>
              <TableCell align="right">Runs</TableCell>
              <TableCell align="right">Balls</TableCell>
              <TableCell align="right">4s</TableCell>
              <TableCell align="right">6s</TableCell>
              <TableCell align="right">S/R</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentInning.battingStats.map((stat) => {
              const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id || '';
              const playerName = typeof stat.player === 'string' 
                ? players.find(p => p._id === stat.player)?.name 
                : stat.player.name;
              const strikeRate =
                stat.balls > 0
                  ? ((stat.runs / stat.balls) * 100).toFixed(2)
                  : '0.00';

              return (
                <TableRow key={playerId}>
                  <TableCell>
                    {playerName}
                    {playerId === striker && '*'}
                    {playerId === nonStriker && '*'}
                  </TableCell>
                  <TableCell align="right">{stat.runs}</TableCell>
                  <TableCell align="right">{stat.balls}</TableCell>
                  <TableCell align="right">{stat.fours}</TableCell>
                  <TableCell align="right">{stat.sixes}</TableCell>
                  <TableCell align="right">{strikeRate}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Bowling Scorecard */}
      <Typography variant="h6" gutterBottom>
        Bowling
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Bowler</TableCell>
              <TableCell align="right">Overs</TableCell>
              <TableCell align="right">Runs</TableCell>
              <TableCell align="right">Wickets</TableCell>
              <TableCell align="right">Economy</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentInning.bowlingStats.map((stat) => {
              const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id || '';
              const playerName = typeof stat.player === 'string'
                ? players.find(p => p._id === stat.player)?.name
                : stat.player.name;
              const economy =
                stat.overs > 0
                  ? (stat.runs / stat.overs).toFixed(2)
                  : '0.00';

              return (
                <TableRow key={playerId}>
                  <TableCell>
                    {playerName}
                    {playerId === bowler && '*'}
                  </TableCell>
                  <TableCell align="right">{stat.overs.toFixed(1)}</TableCell>
                  <TableCell align="right">{stat.runs}</TableCell>
                  <TableCell align="right">{stat.wickets}</TableCell>
                  <TableCell align="right">{economy}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Wicket Dialog */}
      <Dialog open={isWicketDialogOpen} onClose={() => setIsWicketDialogOpen(false)}>
        <DialogTitle>Wicket Type</DialogTitle>
        <DialogContent>
          <Stack spacing={2} component="div">
            <Button onClick={() => handleWicket('bowled')}>Bowled</Button>
            <Button onClick={() => handleWicket('caught')}>Caught</Button>
            <Button onClick={() => handleWicket('lbw')}>LBW</Button>
            <Button onClick={() => handleWicket('runout')}>Run Out</Button>
            <Button onClick={() => handleWicket('stumped')}>Stumped</Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsWicketDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LiveScoring;