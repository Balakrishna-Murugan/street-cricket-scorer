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
  Alert,
  AlertTitle,
  TextField,
  Container,
  useTheme,
  useMediaQuery,
} from '@mui/material';

interface Props {}

const LiveScoring: React.FC<Props> = () => {
  const { matchId } = useParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Check user role for permissions
  const userRole = localStorage.getItem('userRole') || 'viewer';
  const isAdmin = userRole === 'admin';
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentInnings, setCurrentInnings] = useState<number>(0);
  const [striker, setStriker] = useState<string>('');
  const [nonStriker, setNonStriker] = useState<string>('');
  const [bowler, setBowler] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [isWicketDialogOpen, setIsWicketDialogOpen] = useState(false);
  const [currentOverBalls, setCurrentOverBalls] = useState<BallOutcome[]>([]);
  const [isWaitingForNewBatsman, setIsWaitingForNewBatsman] = useState(false);
  const [wicketDetails, setWicketDetails] = useState<{
    type: string;
    caughtBy?: string;
    runOutBy?: string;
    stumpedBy?: string;
  } | null>(null);

  // State for bye/leg bye runs dialog
  const [isExtraRunsDialogOpen, setIsExtraRunsDialogOpen] = useState(false);
  const [extraType, setExtraType] = useState<'bye' | 'legBye' | 'wide' | 'noBall' | null>(null);
  const [extraRuns, setExtraRuns] = useState<number>(1);

  const [strikerStats, setStrikerStats] = useState<{ runs: number; balls: number }>({ runs: 0, balls: 0 });
  const [nonStrikerStats, setNonStrikerStats] = useState<{ runs: number; balls: number }>({ runs: 0, balls: 0 });
  const [bowlerStats, setBowlerStats] = useState<{ overs: number; runs: number; wickets: number; balls: number }>({ overs: 0, runs: 0, wickets: 0, balls: 0 });
  const [isFirstInningsComplete, setIsFirstInningsComplete] = useState(false);
  const [isMatchCompleted, setIsMatchCompleted] = useState(false);

  // Function to check if match should end
  const checkMatchEnd = useCallback((updatedMatch: any) => {
    if (!updatedMatch || !updatedMatch.innings || updatedMatch.innings.length < 2) {
      return false;
    }

    const secondInnings = updatedMatch.innings[1];
    const firstInnings = updatedMatch.innings[0];
    
    // Only check for match end during second innings
    if (currentInnings !== 1) {
      return false;
    }

    const target = (firstInnings.totalRuns || 0) + 1;
    const currentScore = secondInnings.totalRuns || 0;
    const wicketsLost = secondInnings.wickets || 0;

    // Check if team has reached target
    if (currentScore >= target) {
      const wicketsRemaining = 10 - wicketsLost;
      updatedMatch.status = 'completed';
      updatedMatch.result = `${typeof secondInnings.battingTeam === 'object' ? secondInnings.battingTeam.name : 'Team 2'} won by ${wicketsRemaining} wickets`;
      
      // Complete the match
      secondInnings.isCompleted = true;
      
      return true;
    }

    // Check if team lost all 10 wickets
    if (wicketsLost >= 10) {
      const runsDifference = (firstInnings.totalRuns || 0) - currentScore;
      updatedMatch.status = 'completed';
      updatedMatch.result = `${typeof firstInnings.battingTeam === 'object' ? firstInnings.battingTeam.name : 'Team 1'} won by ${runsDifference} runs`;
      
      // Complete the match
      secondInnings.isCompleted = true;
      
      return true;
    }

    return false;
  }, [currentInnings]);

  // Simplified match loading without over control
  const loadMatch = useCallback(async () => {
    if (!matchId) return;
    
    try {
      setLoading(true);
      const response = await matchService.getById(matchId);
      console.log('Match data loaded:', response.data);
      
      if (response.data) {
        setMatch(response.data);
        setCurrentInnings(response.data.currentInnings || 0);
        
        // Initialize current over balls if resuming
        const currentInning = response.data.innings[response.data.currentInnings || 0];
        if (currentInning?.currentOverBalls) {
          setCurrentOverBalls(currentInning.currentOverBalls);
        }
        
        // Set batting players if available
        if (currentInning?.battingStats?.length > 0) {
          const onStrikeBatter = currentInning.battingStats.find((stat: any) => stat.isOnStrike && !stat.isOut);
          const nonStrikeBatter = currentInning.battingStats.find((stat: any) => !stat.isOnStrike && !stat.isOut);
          
          if (onStrikeBatter) {
            setStriker(typeof onStrikeBatter.player === 'string' ? onStrikeBatter.player : onStrikeBatter.player._id || '');
          }
          
          if (nonStrikeBatter) {
            setNonStriker(typeof nonStrikeBatter.player === 'string' ? nonStrikeBatter.player : nonStrikeBatter.player._id || '');
          }
        }
        
        // Set bowler if available
        if (currentInning?.bowlingStats?.length > 0) {
          const currentBowler = currentInning.bowlingStats[currentInning.bowlingStats.length - 1];
          if (currentBowler) {
            setBowler(typeof currentBowler.player === 'string' ? currentBowler.player : currentBowler.player._id || '');
          }
        }
      }
    } catch (err) {
      console.error('Error loading match:', err);
      setError('Failed to load match data');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  // Simplified ball outcome handler without over control
  const handleBallOutcome = async (runs: number, isExtra: boolean = false) => {
    if (!match || !matchId) return;
    if (!striker || !nonStriker || !bowler) {
      setError('Please select striker, non-striker, and bowler before scoring');
      return;
    }

    try {
      const updatedMatch = { ...match };
      updatedMatch.currentInnings = currentInnings;
      const currentInning = updatedMatch.innings[currentInnings];
      
      if (!currentInning) {
        setError('Current innings not found');
        return;
      }

      // Initialize required arrays if missing
      if (!currentInning.balls) currentInning.balls = 0;
      if (!currentInning.totalRuns) currentInning.totalRuns = 0;
      if (!currentInning.wickets) currentInning.wickets = 0;
      if (!currentInning.battingStats) currentInning.battingStats = [];
      if (!currentInning.bowlingStats) currentInning.bowlingStats = [];
      if (!currentInning.currentOverBalls) currentInning.currentOverBalls = [];

      // Create ball outcome
      const ballOutcome: BallOutcome = {
        ballNumber: (currentInning.currentOverBalls?.length || 0) + 1,
        runs,
        isWicket: false,
        ...(isExtra && { extras: { type: 'bye', runs } }) // Only include extras if it's an extra
      };

      // Add to current over and match
      currentInning.currentOverBalls.push(ballOutcome);
      setCurrentOverBalls([...currentInning.currentOverBalls]);

      // Update match stats
      if (!isExtra) {
        currentInning.balls += 1;
      }
      currentInning.totalRuns += runs;

      // Update batting stats
      let strikerBattingStats = currentInning.battingStats.find(stat => 
        (typeof stat.player === 'string' ? stat.player : stat.player._id) === striker
      );

      if (!strikerBattingStats) {
        strikerBattingStats = {
          player: striker,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          isOnStrike: true,
          dismissalType: undefined,
          howOut: undefined,
          dismissedBy: undefined,
          strikeRate: 0
        };
        if (strikerBattingStats) {
          currentInning.battingStats.push(strikerBattingStats);
        }
      }

      if (strikerBattingStats) {
        if (!isExtra) {
          strikerBattingStats.balls += 1;
        }
        strikerBattingStats.runs += runs;

        if (runs === 4) strikerBattingStats.fours += 1;
        if (runs === 6) strikerBattingStats.sixes += 1;
      }

      // Update bowling stats
      let bowlerBowlingStats = currentInning.bowlingStats.find(stat =>
        (typeof stat.player === 'string' ? stat.player : stat.player._id) === bowler
      );

      if (!bowlerBowlingStats) {
        bowlerBowlingStats = {
          player: bowler,
          overs: 0,
          runs: 0,
          wickets: 0,
          balls: 0,
          wides: 0,
          noBalls: 0,
          economy: 0
        };
        if (bowlerBowlingStats) {
          currentInning.bowlingStats.push(bowlerBowlingStats);
        }
      }

      if (bowlerBowlingStats) {
        if (!isExtra) {
          bowlerBowlingStats.balls += 1;
          bowlerBowlingStats.overs = Math.floor(bowlerBowlingStats.balls / 6) + (bowlerBowlingStats.balls % 6) / 10;
        }
        bowlerBowlingStats.runs += runs;
      }

      // Check for over completion (6 valid balls)
      const validBalls = (currentInning.currentOverBalls || []).filter(ball => !ball.extras).length;
      if (validBalls === 6) {
        // Over completed - clear current over and swap strike
        currentInning.currentOverBalls = [];
        setCurrentOverBalls([]);
        
        // Swap strike for new over
        const temp = striker;
        setStriker(nonStriker);
        setNonStriker(temp);
      } else {
        // Check for strike change on odd runs
        if (runs % 2 === 1) {
          const temp = striker;
          setStriker(nonStriker);
          setNonStriker(temp);
        }
      }

      // Check match end conditions
      checkMatchEnd(updatedMatch);

      // Save updated match
      const savedMatch = await matchService.update(matchId, updatedMatch);
      setMatch(savedMatch.data);

    } catch (err) {
      console.error('Error updating ball outcome:', err);
      setError('Failed to update ball outcome');
    }
  };

  // Simplified wicket handler
  const handleWicket = async (dismissalType: string, fielderId?: string) => {
    if (!match || !matchId || !striker || !bowler) return;

    try {
      const updatedMatch = { ...match };
      const currentInning = updatedMatch.innings[currentInnings];
      
      if (!currentInning) return;

      // Add wicket ball
      const ballOutcome: BallOutcome = {
        ballNumber: (currentInning.currentOverBalls?.length || 0) + 1,
        runs: 0,
        isWicket: true,
        dismissalType: dismissalType as 'bowled' | 'caught' | 'run out' | 'stumped' | 'lbw' | 'hit wicket',
        fielder: fielderId
      };

      if (!currentInning.currentOverBalls) {
        currentInning.currentOverBalls = [];
      }
      currentInning.currentOverBalls.push(ballOutcome);
      setCurrentOverBalls([...currentInning.currentOverBalls]);

      // Update match stats
      currentInning.balls += 1;
      currentInning.wickets += 1;

      // Update batting stats
      let strikerBattingStats = currentInning.battingStats.find(stat =>
        (typeof stat.player === 'string' ? stat.player : stat.player._id) === striker
      );

      if (strikerBattingStats) {
        strikerBattingStats.balls += 1;
        strikerBattingStats.isOut = true;
        strikerBattingStats.dismissalType = dismissalType;
        strikerBattingStats.dismissedBy = bowler;
      }

      // Update bowling stats
      let bowlerBowlingStats = currentInning.bowlingStats.find(stat =>
        (typeof stat.player === 'string' ? stat.player : stat.player._id) === bowler
      );

      if (bowlerBowlingStats) {
        bowlerBowlingStats.balls += 1;
        bowlerBowlingStats.wickets += 1;
        bowlerBowlingStats.overs = Math.floor(bowlerBowlingStats.balls / 6) + (bowlerBowlingStats.balls % 6) / 10;
      }

      // Clear striker - need new batsman
      setStriker('');
      setIsWaitingForNewBatsman(true);

      // Check match end conditions
      checkMatchEnd(updatedMatch);

      // Save updated match
      const savedMatch = await matchService.update(matchId, updatedMatch);
      setMatch(savedMatch.data);

    } catch (err) {
      console.error('Error handling wicket:', err);
      setError('Failed to handle wicket');
    }

    setIsWicketDialogOpen(false);
  };

  // Load players
  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const response = await playerService.getAll();
        setPlayers(response.data);
      } catch (err) {
        console.error('Error loading players:', err);
      }
    };

    loadPlayers();
  }, []);

  // Load match data
  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  if (loading) return <Typography>Loading match...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!match) return <Typography>Match not found</Typography>;

  const currentInning = match.innings[currentInnings];

  // Filter players by teams - need to fetch full team data to get members
  // For now, just return all players since we don't have access to full team data
  const battingPlayers = players;
  const bowlingPlayers = players;

  // Get available batsmen (not out)
  const availableBatsmen = battingPlayers.filter(p => {
    const battingStats = currentInning?.battingStats?.find(stat =>
      (typeof stat.player === 'string' ? stat.player : stat.player._id) === p._id
    );
    return !battingStats?.isOut;
  });

  return (
    <Container maxWidth="lg">
      <Box sx={{ p: 2 }}>
        <MatchDetails 
          totalRuns={currentInning?.totalRuns || 0}
          wickets={currentInning?.wickets || 0}
          overs={currentInning?.overs || 0}
          currentOverBalls={currentOverBalls}
          striker={striker}
          nonStriker={nonStriker}
          bowler={bowler}
          players={players}
          strikerStats={{ runs: 0, balls: 0 }}
          nonStrikerStats={{ runs: 0, balls: 0 }}
          bowlerStats={{ overs: 0, runs: 0, wickets: 0, balls: 0 }}
        />
        
        {/* Player Selection */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Select Players
          </Typography>
          
          <Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Striker</InputLabel>
              <Select
                value={striker}
                onChange={(e) => setStriker(e.target.value)}
                label="Striker"
              >
                {availableBatsmen.map(player => (
                  <MenuItem key={player._id} value={player._id}>
                    {player.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Non-Striker</InputLabel>
              <Select
                value={nonStriker}
                onChange={(e) => setNonStriker(e.target.value)}
                label="Non-Striker"
              >
                {availableBatsmen.map(player => (
                  <MenuItem key={player._id} value={player._id}>
                    {player.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Bowler</InputLabel>
              <Select
                value={bowler}
                onChange={(e) => setBowler(e.target.value)}
                label="Bowler"
              >
                {bowlingPlayers.map(player => (
                  <MenuItem key={player._id} value={player._id}>
                    {player.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Paper>

        {/* Scoring Buttons */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Quick Scoring
          </Typography>
          
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {[0, 1, 2, 3, 4, 6].map(runs => (
              <Button
                key={runs}
                variant="contained"
                size="large"
                onClick={() => handleBallOutcome(runs)}
                disabled={!striker || !nonStriker || !bowler}
                sx={{ minWidth: 60 }}
              >
                {runs}
              </Button>
            ))}
            
            <Button
              variant="outlined"
              onClick={() => setIsWicketDialogOpen(true)}
              disabled={!striker || !nonStriker || !bowler}
            >
              Wicket
            </Button>
          </Stack>

          {/* Extras */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Extras
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="outlined"
                onClick={() => handleBallOutcome(1, true)}
                disabled={!striker || !nonStriker || !bowler}
              >
                Wide
              </Button>
              <Button
                variant="outlined" 
                onClick={() => handleBallOutcome(1, true)}
                disabled={!striker || !nonStriker || !bowler}
              >
                No Ball
              </Button>
              <Button
                variant="outlined"
                onClick={() => handleBallOutcome(1, true)}
                disabled={!striker || !nonStriker || !bowler}
              >
                Bye
              </Button>
              <Button
                variant="outlined"
                onClick={() => handleBallOutcome(1, true)}
                disabled={!striker || !nonStriker || !bowler}
              >
                Leg Bye
              </Button>
            </Stack>
          </Box>
        </Paper>

        {/* Current Over Display */}
        {currentOverBalls.length > 0 && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Current Over
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {currentOverBalls.map((ball, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: ball.isWicket ? 'error.main' : 'primary.main',
                    color: 'white',
                    fontSize: '0.875rem'
                  }}
                >
                  {ball.isWicket ? 'W' : ball.runs}
                </Box>
              ))}
            </Box>
          </Paper>
        )}

        {/* Match Stats */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Current Innings: {currentInning?.totalRuns || 0}/{currentInning?.wickets || 0}
          </Typography>
          <Typography variant="body2">
            Overs: {Math.floor((currentInning?.balls || 0) / 6)}.{(currentInning?.balls || 0) % 6}
          </Typography>
        </Paper>

        {/* Wicket Dialog */}
        <Dialog open={isWicketDialogOpen} onClose={() => setIsWicketDialogOpen(false)}>
          <DialogTitle>Record Wicket</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Button onClick={() => handleWicket('bowled')}>Bowled</Button>
              <Button onClick={() => handleWicket('caught')}>Caught</Button>
              <Button onClick={() => handleWicket('lbw')}>LBW</Button>
              <Button onClick={() => handleWicket('run_out')}>Run Out</Button>
              <Button onClick={() => handleWicket('stumped')}>Stumped</Button>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsWicketDialogOpen(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>

        {/* New Batsman Selection Dialog */}
        <Dialog open={isWaitingForNewBatsman} onClose={() => {}}>
          <DialogTitle>Select New Batsman</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {availableBatsmen.filter(p => p._id !== nonStriker).map(player => (
                <Button
                  key={player._id}
                  onClick={() => {
                    if (player._id) {
                      setStriker(player._id);
                      setIsWaitingForNewBatsman(false);
                    }
                  }}
                >
                  {player.name}
                </Button>
              ))}
            </Stack>
          </DialogContent>
        </Dialog>
      </Box>
    </Container>
  );
};

export default LiveScoring;