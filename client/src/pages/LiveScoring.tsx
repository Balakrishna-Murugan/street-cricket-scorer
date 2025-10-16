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
  Autocomplete,
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
  const [isOverInProgress, setIsOverInProgress] = useState(false);
  const [isOverCompleted, setIsOverCompleted] = useState(false);
  const [overCompletionMessage, setOverCompletionMessage] = useState<string>('');
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
  const [allowBowlerChange, setAllowBowlerChange] = useState(false);
  const [bowlerChangeReason, setBowlerChangeReason] = useState('');
  const [bowlersUsedInCurrentOver, setBowlersUsedInCurrentOver] = useState<string[]>([]);
  const [isBowlerChangeDialogOpen, setIsBowlerChangeDialogOpen] = useState(false);
  const [pendingBowlerChange, setPendingBowlerChange] = useState('');
  const [isFirstInningsComplete, setIsFirstInningsComplete] = useState(false);
  const [isMatchCompleted, setIsMatchCompleted] = useState(false);
  
  // New state for player selection dialog
  const [isPlayerSelectionDialogOpen, setIsPlayerSelectionDialogOpen] = useState(false);

  // Helper function to check if all required players are selected
  const arePlayersSelected = useCallback(() => {
    return striker && nonStriker && bowler && striker !== nonStriker;
  }, [striker, nonStriker, bowler]);

  // Helper function to count available batsmen for the batting team
  const getAvailableBatsmen = useCallback(() => {
    if (!match || !players || players.length === 0) return [];
    
    const currentInning = match.innings[currentInnings];
    if (!currentInning) return [];
    
    const battingTeamId = typeof currentInning?.battingTeam === 'string' 
      ? currentInning.battingTeam 
      : currentInning?.battingTeam?._id;
    
    if (!battingTeamId) return [];
    
    return players.filter(player => {
      // Check if player has teams and battingTeamId exists
      if (!player.teams || !Array.isArray(player.teams)) return false;
      
      // Check if player belongs to batting team
      const hasTeam = player.teams.some(team => {
        const teamId = typeof team === 'string' ? team : team._id;
        return teamId === String(battingTeamId);
      });
      
      if (!hasTeam) return false;
      
      // Check if player is out
      const isPlayerOut = currentInning.battingStats && Array.isArray(currentInning.battingStats) 
        ? currentInning.battingStats.some(stat => {
            const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id;
            return playerId === player._id && stat.isOut;
          })
        : false;
      
      return !isPlayerOut;
    });
  }, [match, players, currentInnings]);

  // Helper function to get dialog context
  const getDialogContext = useCallback(() => {
    if (isOverCompleted) {
      return {
        title: '🎯 Over Completed - Select New Bowler',
        message: 'The over is completed. Please select a new bowler to continue:',
        showOnlyBowler: true,
        gradientColor: 'linear-gradient(45deg, #FF9800 30%, #FFB74D 90%)'
      };
    } else if (isWaitingForNewBatsman) {
      return {
        title: '🏏 Wicket! Select New Batsman',
        message: 'A wicket has been taken. Please select a new striker to continue:',
        showOnlyStriker: true,
        gradientColor: 'linear-gradient(45deg, #f44336 30%, #e57373 90%)'
      };
    } else {
      return {
        title: '🏏 Select Players to Start Match',
        message: `Please select the striker, non-striker, and bowler to ${match && match.innings.length > 1 && currentInnings === 1 ? 'continue with the match' : 'start the match'}:`,
        showOnlyBowler: false,
        showOnlyStriker: false,
        gradientColor: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'
      };
    }
  }, [isOverCompleted, isWaitingForNewBatsman, match, currentInnings]);

  // Helper function to check if required selections are made based on context
  const areRequiredSelectionsComplete = useCallback(() => {
    const context = getDialogContext();
    if (context.showOnlyBowler) {
      return !!bowler;
    } else if (context.showOnlyStriker) {
      return !!striker && striker !== nonStriker;
    } else {
      return arePlayersSelected();
    }
  }, [getDialogContext, bowler, striker, nonStriker, arePlayersSelected]);

  // Function to handle starting/continuing match with player selection
  const handleStartOrContinueMatch = async () => {
    // Check if there are enough batsmen to start/continue the match
    const availableBatsmen = getAvailableBatsmen();
    console.log('Available batsmen for match start:', availableBatsmen.length, availableBatsmen.map(p => p.name));
    
    if (availableBatsmen.length < 2) {
      // Not enough batsmen to start/continue match - auto complete innings
      if (!match || !matchId) return;
      
      const currentInning = match.innings[currentInnings];
      if (!currentInning) return;
      
      if (currentInnings === 0) {
        // First innings can't start - move to second innings
        try {
          const updatedMatch = { ...match };
          
          // Mark first innings as completed due to insufficient batsmen
          updatedMatch.innings[0].isCompleted = true;
          
          // Prepare clean match data for saving
          const cleanMatchData = (match: Match): Match => {
            return {
              ...match,
              team1: typeof match.team1 === 'object' ? match.team1._id : match.team1,
              team2: typeof match.team2 === 'object' ? match.team2._id : match.team2,
              currentInnings: match.currentInnings || 0,
              innings: match.innings.map(inning => ({
                battingTeam: typeof inning.battingTeam === 'object' ? inning.battingTeam._id : inning.battingTeam,
                bowlingTeam: typeof inning.bowlingTeam === 'object' ? inning.bowlingTeam._id : inning.bowlingTeam,
                totalRuns: inning.totalRuns,
                wickets: inning.wickets,
                overs: inning.overs,
                balls: inning.balls || 0,
                isCompleted: inning.isCompleted || false,
                battingStats: inning.battingStats || [],
                bowlingStats: inning.bowlingStats || [],
                currentState: inning.currentState || {
                  currentOver: 0,
                  currentBall: 0,
                  lastBallRuns: 0
                },
                extras: inning.extras || {
                  wides: 0,
                  noBalls: 0,
                  byes: 0,
                  legByes: 0,
                  total: 0
                },
                runRate: inning.runRate || 0,
                requiredRunRate: inning.requiredRunRate,
                currentOverBalls: inning.currentOverBalls || []
              }))
            };
          };

          // Save the updated match with first innings completed
          const cleanedMatch = cleanMatchData(updatedMatch);
          await matchService.updateScore(matchId, cleanedMatch);
          
          // Update local state
          setMatch(updatedMatch);
          setIsFirstInningsComplete(true);
          setOverCompletionMessage(`First innings skipped - not enough batsmen (${availableBatsmen.length} available). Click "Start Second Innings" to continue.`);
          setIsOverCompleted(true);
          
          setError(''); // Clear any existing errors
          
        } catch (error: any) {
          setError('Error completing first innings due to insufficient batsmen');
          console.error('Error:', error);
        }
        return;
      } else {
        // Second innings can't continue - end match
        try {
          const updatedMatch = { ...match };
          updatedMatch.status = 'completed';
          updatedMatch.innings[1].isCompleted = true;
          
          // Determine winner based on first innings score
          const firstInnings = updatedMatch.innings[0];
          const secondInnings = updatedMatch.innings[1];
          const firstInningsScore = firstInnings.totalRuns || 0;
          const secondInningsScore = secondInnings.totalRuns || 0;
          
          if (firstInningsScore > secondInningsScore) {
            const firstInningsBattingTeam = typeof firstInnings.battingTeam === 'object' && firstInnings.battingTeam
              ? firstInnings.battingTeam.name 
              : 'Team 1';
            const runsDifference = firstInningsScore - secondInningsScore;
            updatedMatch.result = `${firstInningsBattingTeam} won by ${runsDifference} runs`;
          } else if (secondInningsScore > firstInningsScore) {
            const secondInningsBattingTeam = typeof secondInnings.battingTeam === 'object' && secondInnings.battingTeam
              ? secondInnings.battingTeam.name 
              : 'Team 2';
            const runsDifference = secondInningsScore - firstInningsScore;
            updatedMatch.result = `${secondInningsBattingTeam} won by ${runsDifference} runs`;
          } else {
            updatedMatch.result = 'Match ended in a tie';
          }
          
          // Save the completed match
          const cleanMatchData = (match: Match): Match => {
            return {
              ...match,
              team1: typeof match.team1 === 'object' ? match.team1._id : match.team1,
              team2: typeof match.team2 === 'object' ? match.team2._id : match.team2,
              currentInnings: match.currentInnings || 0,
              innings: match.innings.map(inning => ({
                battingTeam: typeof inning.battingTeam === 'object' ? inning.battingTeam._id : inning.battingTeam,
                bowlingTeam: typeof inning.bowlingTeam === 'object' ? inning.bowlingTeam._id : inning.bowlingTeam,
                totalRuns: inning.totalRuns,
                wickets: inning.wickets,
                overs: inning.overs,
                balls: inning.balls || 0,
                isCompleted: inning.isCompleted || false,
                battingStats: inning.battingStats || [],
                bowlingStats: inning.bowlingStats || [],
                currentState: inning.currentState || {
                  currentOver: 0,
                  currentBall: 0,
                  lastBallRuns: 0
                },
                extras: inning.extras || {
                  wides: 0,
                  noBalls: 0,
                  byes: 0,
                  legByes: 0,
                  total: 0
                },
                runRate: inning.runRate || 0,
                requiredRunRate: inning.requiredRunRate,
                currentOverBalls: inning.currentOverBalls || []
              }))
            };
          };

          const cleanedMatch = cleanMatchData(updatedMatch);
          await matchService.updateScore(matchId, cleanedMatch);
          
          // Update local state
          setMatch(updatedMatch);
          setIsMatchCompleted(true);
          setOverCompletionMessage(`Match completed - not enough batsmen to continue second innings (${availableBatsmen.length} available). ${updatedMatch.result}`);
          setIsOverCompleted(true);
          
          setError(''); // Clear any existing errors
          
        } catch (error: any) {
          setError('Error ending match due to insufficient batsmen');
          console.error('Error:', error);
        }
        return;
      }
    }
    
    if (!arePlayersSelected()) {
      setIsPlayerSelectionDialogOpen(true);
    } else {
      // All players selected, can start scoring immediately
      setIsOverInProgress(true);
    }
  };

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
      updatedMatch.result = `${typeof secondInnings.battingTeam === 'object' && secondInnings.battingTeam ? secondInnings.battingTeam.name : 'Team 2'} won by ${wicketsRemaining} wickets`;
      
      // Complete the match
      secondInnings.isCompleted = true;
      
      return true;
    }

    // Check if team lost all 10 wickets
    if (wicketsLost >= 10) {
      const runsDifference = (firstInnings.totalRuns || 0) - currentScore;
      updatedMatch.status = 'completed';
      updatedMatch.result = `${typeof firstInnings.battingTeam === 'object' && firstInnings.battingTeam ? firstInnings.battingTeam.name : 'Team 1'} won by ${runsDifference} runs`;
      
      // Complete the match
      secondInnings.isCompleted = true;
      
      return true;
    }

    return false;
  }, [currentInnings]);

  // Shared function to clean match data for API calls
  const cleanMatchData = useCallback((match: Match): Match => {
    return {
      ...match,
      team1: typeof match.team1 === 'object' ? match.team1._id : match.team1,
      team2: typeof match.team2 === 'object' ? match.team2._id : match.team2,
      currentInnings: match.currentInnings || 0,
      matchSettings: match.matchSettings || {
        oversPerBowler: 4,
        maxPlayersPerTeam: 11
      },
      bowlerRotation: match.bowlerRotation || {
        bowlerOversCount: {},
        availableBowlers: []
      },
      innings: match.innings.map(inning => ({
        battingTeam: typeof inning.battingTeam === 'object' ? inning.battingTeam._id : inning.battingTeam,
        bowlingTeam: typeof inning.bowlingTeam === 'object' ? inning.bowlingTeam._id : inning.bowlingTeam,
        totalRuns: inning.totalRuns,
        wickets: inning.wickets,
        overs: inning.overs,
        balls: inning.balls || 0,
        isCompleted: inning.isCompleted || false,
        battingStats: inning.battingStats.map(stat => ({
          player: typeof stat.player === 'object' ? stat.player._id : stat.player,
          runs: stat.runs,
          balls: stat.balls,
          fours: stat.fours,
          sixes: stat.sixes,
          isOut: stat.isOut,
          dismissalType: stat.dismissalType,
          howOut: stat.howOut,
          dismissedBy: stat.dismissedBy,
          strikeRate: stat.strikeRate || 0,
          isOnStrike: stat.isOnStrike || false
        })),
        bowlingStats: inning.bowlingStats.map(stat => ({
          player: typeof stat.player === 'object' ? stat.player._id : stat.player,
          overs: stat.overs,
          balls: stat.balls || 0,
          runs: stat.runs,
          wickets: stat.wickets,
          wides: stat.wides || 0,
          noBalls: stat.noBalls || 0,
          economy: stat.economy || 0,
          lastBowledOver: stat.lastBowledOver
        })),
        currentState: inning.currentState || {
          currentOver: 0,
          currentBall: 0,
          lastBallRuns: 0
        },
        extras: {
          ...inning.extras,
          total: inning.extras.total || 0
        },
        runRate: inning.runRate || 0,
        requiredRunRate: inning.requiredRunRate,
        currentOverBalls: inning.currentOverBalls || []
      }))
    };
  }, []);

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
      
      // Sync currentInnings state with match data
      if (data && typeof data.currentInnings === 'number') {
        console.log('FetchMatch - Setting currentInnings to:', data.currentInnings);
        setCurrentInnings(data.currentInnings);
      } else {
        console.log('FetchMatch - No currentInnings in data, using 0');
        setCurrentInnings(0);
      }
      
      // Initialize striker, non-striker, and bowler if not set
      if (data && data.innings && data.innings.length > 0) {
        const actualCurrentInnings = data.currentInnings || 0;
        const currentInning = data.innings[actualCurrentInnings];
        
        // Check if currentInning exists and has required properties
        if (!currentInning) {
          console.warn('Current inning not found for index:', actualCurrentInnings);
          return;
        }
        
        // Ensure battingStats and bowlingStats exist
        if (!currentInning.battingStats) {
          currentInning.battingStats = [];
        }
        if (!currentInning.bowlingStats) {
          currentInning.bowlingStats = [];
        }
        
        // Determine if an over is in progress based on match state
        const currentState = currentInning.currentState;
        const totalBalls = currentInning.balls || 0;
        const currentBall = totalBalls % 6;
        
        // If there are balls bowled in current over and it's not completed, over is in progress
        if (currentBall > 0 || (currentState && currentState.currentBall > 0)) {
          setIsOverInProgress(true);
          setIsOverCompleted(false);
          
          // FIXED: Restore current over's ball-by-ball history when resuming match
          if (currentInning.currentOverBalls && currentInning.currentOverBalls.length > 0) {
            console.log('Restoring current over balls from stored data:', currentInning.currentOverBalls);
            setCurrentOverBalls(currentInning.currentOverBalls);
          } else {
            // If no stored balls, create placeholder balls for current over since we don't have detailed over data
            const ballsInCurrentOver = currentBall || (currentState?.currentBall || 0);
            
            if (ballsInCurrentOver > 0) {
              // Create placeholder balls only if we can't find the actual data
              const placeholderBalls: BallOutcome[] = [];
              for (let i = 0; i < ballsInCurrentOver; i++) {
                placeholderBalls.push({
                  ballNumber: i + 1,
                  runs: 0, // We don't have the exact data, so show placeholder
                  isWicket: false
                });
              }
              console.log('Creating placeholder balls for current over:', placeholderBalls);
              setCurrentOverBalls(placeholderBalls);
            } else {
              setCurrentOverBalls([]);
            }
          }
        } else if (totalBalls > 0 && currentBall === 0) {
          // If total balls is multiple of 6, over might be completed
          setIsOverCompleted(false);
          setIsOverInProgress(false);
          setCurrentOverBalls([]);
        }
        
        // Always initialize striker from match data
        if (currentInning.battingStats && Array.isArray(currentInning.battingStats) && currentInning.battingStats.length > 0) {
          // Find the player who is currently on strike
          const onStrikeBatter = currentInning.battingStats.find(stat => stat.isOnStrike && !stat.isOut);
          if (onStrikeBatter) {
            const strikerId = typeof onStrikeBatter.player === 'string' 
              ? onStrikeBatter.player 
              : onStrikeBatter.player._id || '';
            setStriker(strikerId);
          } else {
            // If no one is marked as on strike, find first non-out batsman
            const firstNonOutBatter = currentInning.battingStats.find(stat => !stat.isOut);
            if (firstNonOutBatter) {
              const strikerId = typeof firstNonOutBatter.player === 'string' 
                ? firstNonOutBatter.player 
                : firstNonOutBatter.player._id || '';
              setStriker(strikerId);
            }
          }
        }
        
        // Always initialize non-striker from match data
        if (currentInning.battingStats && Array.isArray(currentInning.battingStats) && currentInning.battingStats.length > 1) {
          // Find the non-striker (not on strike and not out)
          const nonStrikeBatter = currentInning.battingStats.find(stat => !stat.isOnStrike && !stat.isOut);
          if (nonStrikeBatter) {
            const nonStrikerId = typeof nonStrikeBatter.player === 'string'
              ? nonStrikeBatter.player
              : nonStrikeBatter.player._id || '';
            setNonStriker(nonStrikerId);
          } else if (currentInning.battingStats && Array.isArray(currentInning.battingStats) && currentInning.battingStats.length > 1) {
            // Fallback to second batsman if available
            const secondBatter = currentInning.battingStats[1];
            if (secondBatter && !secondBatter.isOut) {
              const nonStrikerId = typeof secondBatter.player === 'string'
                ? secondBatter.player
                : secondBatter.player._id || '';
              setNonStriker(nonStrikerId);
            }
          }
        }
        
        // Always initialize bowler from match data
        if (currentInning.bowlingStats.length > 0) {
          // Find the current bowler (last one who bowled or has incomplete over)
          const currentBowler = currentInning.bowlingStats.find(stat => {
            const bowlerBalls = stat.balls || 0;
            return bowlerBalls % 6 !== 0 || stat.lastBowledOver === undefined;
          });
          
          if (currentBowler) {
            const bowlerId = typeof currentBowler.player === 'string'
              ? currentBowler.player
              : currentBowler.player._id || '';
            setBowler(bowlerId);
          } else {
            // Fallback to first bowler
            const firstBowler = currentInning.bowlingStats[0];
            const bowlerId = typeof firstBowler.player === 'string'
              ? firstBowler.player
              : firstBowler.player._id || '';
            setBowler(bowlerId);
          }
        }
      }
    } catch (error) {
      setError('Error fetching match details');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchMatch();
    fetchPlayers();
  }, [fetchMatch, fetchPlayers]);

  // Reset dropdown selections when innings changes, but preserve score displays
  useEffect(() => {
    if (currentInnings === 1) {
      // FIXED: Only reset dropdowns for second innings, not the score displays
      // The MatchDetails component will show the correct innings scores from match data
      setStriker('');
      setNonStriker('');
      setBowler('');
      setCurrentOverBalls([]);
      
      // Reset local batting/bowling stats display to 0 for new players who will be selected
      setStrikerStats({ runs: 0, balls: 0 });
      setNonStrikerStats({ runs: 0, balls: 0 });
      setBowlerStats({ overs: 0, runs: 0, wickets: 0, balls: 0 });
      
      // Force a re-fetch of match data to ensure UI is refreshed with second innings
      setTimeout(() => {
        fetchMatch();
      }, 500);
    }
  }, [currentInnings, fetchMatch]);

  // Sync local striker and non-striker stats with match data
  useEffect(() => {
    if (match && match.innings && match.innings.length > 0 && striker && nonStriker) {
      const currentInning = match.innings[currentInnings];
      
      // Check if currentInning exists and has battingStats
      if (!currentInning || !currentInning.battingStats) {
        return;
      }
      
      const strikerBattingStats = currentInning.battingStats.find(
        (stat) => typeof stat.player === 'string' ? stat.player === striker : stat.player._id === striker
      );
      
      const nonStrikerBattingStats = currentInning.battingStats.find(
        (stat) => typeof stat.player === 'string' ? stat.player === nonStriker : stat.player._id === nonStriker
      );
      
      if (strikerBattingStats) {
        setStrikerStats({
          runs: strikerBattingStats.runs,
          balls: strikerBattingStats.balls
        });
      }
      
      if (nonStrikerBattingStats) {
        setNonStrikerStats({
          runs: nonStrikerBattingStats.runs,
          balls: nonStrikerBattingStats.balls
        });
      }

      // Sync bowler stats
      if (bowler) {
        const bowlerBowlingStats = currentInning.bowlingStats.find(
          (stat) => typeof stat.player === 'string' ? stat.player === bowler : stat.player._id === bowler
        );
        
        if (bowlerBowlingStats) {
          setBowlerStats({
            overs: bowlerBowlingStats.overs,
            runs: bowlerBowlingStats.runs,
            wickets: bowlerBowlingStats.wickets,
            balls: bowlerBowlingStats.balls || 0
          });
        }
      }
    }
  }, [match, striker, nonStriker, bowler, currentInnings]);

  // Auto-open player selection dialog when match loads if no players selected
  useEffect(() => {
    if (match && isAdmin && !arePlayersSelected() && !isPlayerSelectionDialogOpen && !loading) {
      // Small delay to ensure UI has rendered
      const timer = setTimeout(() => {
        setIsPlayerSelectionDialogOpen(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [match, isAdmin, arePlayersSelected, isPlayerSelectionDialogOpen, loading]);

  // Auto-open player selection dialog when over is completed and needs new bowler
  useEffect(() => {
    if (isOverCompleted && isAdmin && !isPlayerSelectionDialogOpen) {
      // Delay to allow UI to update the over completion alert first
      const timer = setTimeout(() => {
        setIsPlayerSelectionDialogOpen(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isOverCompleted, isAdmin, isPlayerSelectionDialogOpen]);

  // Auto-open player selection dialog when waiting for new batsman after wicket
  useEffect(() => {
    if (isWaitingForNewBatsman && isAdmin && !isPlayerSelectionDialogOpen) {
      // Delay to allow wicket recording to complete
      const timer = setTimeout(() => {
        setIsPlayerSelectionDialogOpen(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isWaitingForNewBatsman, isAdmin, isPlayerSelectionDialogOpen]);

  const handleBallOutcome = async (runs: number, isExtra: boolean = false) => {
    if (!match || !matchId) return;

    if (!isOverInProgress) {
      setError('Please start a new over first');
      return;
    }

    console.log('HandleBallOutcome - currentInnings:', currentInnings);
    console.log('HandleBallOutcome - match.currentInnings:', match.currentInnings);
    console.log('HandleBallOutcome - match.innings length:', match.innings.length);

    const updatedMatch = { ...match };
    // CRITICAL FIX: Ensure updatedMatch.currentInnings matches our state
    updatedMatch.currentInnings = currentInnings;
    const currentInning = updatedMatch.innings[currentInnings];

    console.log('HandleBallOutcome - currentInning:', currentInning);
    console.log('HandleBallOutcome - updatedMatch.currentInnings set to:', updatedMatch.currentInnings);

    // Check if currentInning exists
    if (!currentInning) {
      setError('Current inning not found');
      return;
    }

    // Ensure required arrays exist
    if (!currentInning.battingStats) {
      currentInning.battingStats = [];
    }
    if (!currentInning.bowlingStats) {
      currentInning.bowlingStats = [];
    }

    // Update current state
    if (!currentInning.currentState) {
      currentInning.currentState = {
        currentOver: 0,
        currentBall: 0,
        lastBallRuns: runs
      };
    }

    if (!isExtra) {
      // Ensure battingStats array exists
      if (!currentInning.battingStats) {
        currentInning.battingStats = [];
      }
      
      // Update striker's stats
      let strikerBattingStats = currentInning.battingStats.find(
        (stat) => typeof stat.player === 'string' ? stat.player === striker : stat.player._id === striker
      );
      
      // If striker stats don't exist, create them
      if (!strikerBattingStats) {
        strikerBattingStats = {
          player: striker,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          strikeRate: 0,
          isOnStrike: true
        };
        currentInning.battingStats.push(strikerBattingStats);
      }
      
      // Update striker stats
      strikerBattingStats.runs += runs;
      strikerBattingStats.balls += 1;
      if (runs === 4) strikerBattingStats.fours += 1;
      if (runs === 6) strikerBattingStats.sixes += 1;
      strikerBattingStats.strikeRate = strikerBattingStats.balls > 0 ? 
        (strikerBattingStats.runs / strikerBattingStats.balls) * 100 : 0;
      strikerBattingStats.isOnStrike = true;

      // Ensure non-striker also has batting stats initialized
      let nonStrikerBattingStats = currentInning.battingStats.find(
        (stat) => typeof stat.player === 'string' ? stat.player === nonStriker : stat.player._id === nonStriker
      );
      
      if (!nonStrikerBattingStats && nonStriker) {
        nonStrikerBattingStats = {
          player: nonStriker,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          strikeRate: 0,
          isOnStrike: false
        };
        currentInning.battingStats.push(nonStrikerBattingStats);
      }

      // Update bowler's stats
      let bowlerBowlingStats = currentInning.bowlingStats.find(
        (stat) => typeof stat.player === 'string' ? stat.player === bowler : stat.player._id === bowler
      );
      
      // If bowler stats don't exist, create them
      if (!bowlerBowlingStats) {
        bowlerBowlingStats = {
          player: bowler,
          overs: 0,
          balls: 0,
          runs: 0,
          wickets: 0,
          wides: 0,
          noBalls: 0,
          economy: 0
        };
        currentInning.bowlingStats.push(bowlerBowlingStats);
      }
      
      bowlerBowlingStats.runs += runs;
      bowlerBowlingStats.balls += 1;
      
      // Calculate overs properly (6 balls = 1 over)
      const totalBalls = bowlerBowlingStats.balls;
      const completeOvers = Math.floor(totalBalls / 6);
      const remainingBalls = totalBalls % 6;
      bowlerBowlingStats.overs = completeOvers + (remainingBalls / 10);
      
      // Calculate economy rate
      if (completeOvers > 0 || remainingBalls > 0) {
        const totalOversForEconomy = totalBalls / 6;
        bowlerBowlingStats.economy = totalOversForEconomy > 0 ? 
          bowlerBowlingStats.runs / totalOversForEconomy : 0;
      }

      setBowlerStats(prev => {
        const newBalls = prev.balls ? prev.balls + 1 : 1;
        const completeOvers = Math.floor(newBalls / 6);
        const remainingBalls = newBalls % 6;
        const newOvers = completeOvers + (remainingBalls / 10);
        
        return {
          overs: newOvers,
          runs: prev.runs + runs,
          wickets: prev.wickets,
          balls: newBalls
        };
      });

      // Update innings totals
      currentInning.totalRuns += runs;
      currentInning.balls = (currentInning.balls || 0) + 1;
      
      // Calculate innings overs properly
      const totalInningsBalls = currentInning.balls;
      const completeInningsOvers = Math.floor(totalInningsBalls / 6);
      const remainingInningsBalls = totalInningsBalls % 6;
      currentInning.overs = completeInningsOvers + (remainingInningsBalls / 10);

      // Update current state
      currentInning.currentState.currentBall = remainingInningsBalls;
      currentInning.currentState.currentOver = completeInningsOvers;
      currentInning.currentState.lastBallRuns = runs;

      // Add ball to current over balls for commentary
      const ballOutcome: BallOutcome = {
        ballNumber: currentOverBalls.length + 1, // Ball number within current over (1-6)
        runs,
        isWicket: false,
        extras: isExtra ? { type: 'wide', runs } : undefined
      };
      
      const newCurrentOverBalls = [...currentOverBalls, ballOutcome];
      setCurrentOverBalls(newCurrentOverBalls);
      
      // FIXED: Store current over balls in match data for persistence
      currentInning.currentOverBalls = newCurrentOverBalls;

      // Check if match should end (for second innings)
      const matchEnded = checkMatchEnd(match);
      if (matchEnded) {
        // Save the match state with the result
        const cleanedMatch = cleanMatchData(match);
        await matchService.updateScore(matchId, cleanedMatch);
        
        // Show match result and stop further actions
        setOverCompletionMessage(match.result || 'Match completed!');
        setIsOverCompleted(true);
        setIsOverInProgress(false);
        setIsMatchCompleted(true);
        
        return;
      }

      // Check if over is complete (6 valid balls)
      if (remainingInningsBalls === 0 && totalInningsBalls > 0) {
        setIsOverInProgress(false);
        
        // Check if innings should end (reached fixed overs)
        if (completeInningsOvers >= match.overs) {
          // Innings completed!
          currentInning.isCompleted = true;
          
          if (currentInnings === 0) {
            // First innings completed, show transition screen
            setIsFirstInningsComplete(true);
            setOverCompletionMessage(`First innings completed! ${completeInningsOvers} overs bowled.`);
            
            // Don't automatically start second innings, wait for user action
            setStriker('');
            setNonStriker('');
            setBowler('');
            setCurrentOverBalls([]);
            setIsOverInProgress(false);
            setIsOverCompleted(true);
            
            // Prepare second innings but don't activate it yet
            const newInnings: any = {
              battingTeam: currentInning.bowlingTeam,
              bowlingTeam: currentInning.battingTeam,
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
            };
            
            // Add new innings to match but don't switch to it yet
            const updatedMatch = { ...match };
            updatedMatch.innings.push(newInnings);
            // Keep currentInnings as 0 until user starts second innings
            
            // Save match with prepared second innings
            try {
              const cleanMatchData = (match: Match): Match => {
                return {
                  ...match,
                  team1: typeof match.team1 === 'object' ? match.team1._id : match.team1,
                  team2: typeof match.team2 === 'object' ? match.team2._id : match.team2,
                  currentInnings: match.currentInnings || 0,
                  innings: match.innings.map(inning => ({
                    battingTeam: typeof inning.battingTeam === 'object' ? inning.battingTeam._id : inning.battingTeam,
                    bowlingTeam: typeof inning.bowlingTeam === 'object' ? inning.bowlingTeam._id : inning.bowlingTeam,
                    totalRuns: inning.totalRuns,
                    wickets: inning.wickets,
                    overs: inning.overs,
                    balls: inning.balls || 0,
                    isCompleted: inning.isCompleted || false,
                    battingStats: inning.battingStats || [],
                    bowlingStats: inning.bowlingStats || [],
                    currentState: inning.currentState || {
                      currentOver: 0,
                      currentBall: 0,
                      lastBallRuns: 0
                    },
                    extras: inning.extras || {
                      wides: 0,
                      noBalls: 0,
                      byes: 0,
                      legByes: 0,
                      total: 0
                    },
                    runRate: inning.runRate || 0
                  }))
                };
              };

              const cleanedMatch = cleanMatchData(updatedMatch);
              await matchService.updateScore(matchId, cleanedMatch);
              setMatch(updatedMatch);
            } catch (error) {
              console.error('Error saving first innings completion:', error);
            }
          } else {
            // Second innings completed, match finished
            setOverCompletionMessage(`Match completed! Second innings finished after ${completeInningsOvers} overs.`);
            setIsOverCompleted(true);
          }
        } else {
          // Just over completed, continue with same innings
          setIsOverCompleted(true);
          setOverCompletionMessage(`Over ${completeInningsOvers} completed! Please select a new bowler and start the next over.`);
        }
        
        // Mark bowler's last bowling over
        if (bowlerBowlingStats) {
          bowlerBowlingStats.lastBowledOver = completeInningsOvers;
        }
      }

      // Rotate strike if odd runs
      if (runs % 2 === 1) {
        const temp = striker;
        setStriker(nonStriker);
        setNonStriker(temp);
        
        // Update strike status in batting stats
        if (currentInning.battingStats && Array.isArray(currentInning.battingStats)) {
          currentInning.battingStats.forEach(stat => {
            if (typeof stat.player === 'string') {
              stat.isOnStrike = stat.player === nonStriker;
            } else {
              stat.isOnStrike = stat.player._id === nonStriker;
            }
          });
        }
        
        // Update local stats to reflect the new striker (who was non-striker before)
        // The runs were already added to the original striker's stats above
        // Now we need to sync the local state with the actual batting stats
        const newStrikerStats = currentInning.battingStats && Array.isArray(currentInning.battingStats)
          ? currentInning.battingStats.find((stat) => typeof stat.player === 'string' ? stat.player === nonStriker : stat.player._id === nonStriker)
          : null;
        const newNonStrikerStats = currentInning.battingStats && Array.isArray(currentInning.battingStats)
          ? currentInning.battingStats.find((stat) => typeof stat.player === 'string' ? stat.player === temp : stat.player._id === temp)
          : null;
        
        setStrikerStats({
          runs: newStrikerStats?.runs || 0,
          balls: newStrikerStats?.balls || 0
        });
        setNonStrikerStats({
          runs: newNonStrikerStats?.runs || 0,
          balls: newNonStrikerStats?.balls || 0
        });
      } else {
        // Update strike status for current striker
        if (currentInning.battingStats && Array.isArray(currentInning.battingStats)) {
          currentInning.battingStats.forEach(stat => {
            if (typeof stat.player === 'string') {
              stat.isOnStrike = stat.player === striker;
            } else {
              stat.isOnStrike = stat.player._id === striker;
            }
          });
        }
        
        // Update local striker stats to match the batting stats
        const currentStrikerStats = currentInning.battingStats && Array.isArray(currentInning.battingStats)
          ? currentInning.battingStats.find((stat) => typeof stat.player === 'string' ? stat.player === striker : stat.player._id === striker)
          : null;
        if (currentStrikerStats) {
          setStrikerStats({
            runs: currentStrikerStats.runs,
            balls: currentStrikerStats.balls
          });
        }
      }
    }

    try {
      const cleanMatchData = (match: Match): Match => {
        return {
          ...match,
          team1: typeof match.team1 === 'object' ? match.team1._id : match.team1,
          team2: typeof match.team2 === 'object' ? match.team2._id : match.team2,
          currentInnings: match.currentInnings || 0,
          matchSettings: match.matchSettings || {
            oversPerBowler: 4,
            maxPlayersPerTeam: 11
          },
          bowlerRotation: match.bowlerRotation || {
            bowlerOversCount: {},
            availableBowlers: []
          },
          innings: match.innings.map(inning => ({
            battingTeam: typeof inning.battingTeam === 'object' ? inning.battingTeam._id : inning.battingTeam,
            bowlingTeam: typeof inning.bowlingTeam === 'object' ? inning.bowlingTeam._id : inning.bowlingTeam,
            totalRuns: inning.totalRuns,
            wickets: inning.wickets,
            overs: inning.overs,
            balls: inning.balls || 0,
            isCompleted: inning.isCompleted || false,
            battingStats: inning.battingStats.map(stat => ({
              player: typeof stat.player === 'object' ? stat.player._id : stat.player,
              runs: stat.runs,
              balls: stat.balls,
              fours: stat.fours,
              sixes: stat.sixes,
              isOut: stat.isOut,
              dismissalType: stat.dismissalType,
              howOut: stat.howOut,
              dismissedBy: stat.dismissedBy,
              strikeRate: stat.strikeRate || 0,
              isOnStrike: stat.isOnStrike || false
            })),
            bowlingStats: inning.bowlingStats.map(stat => ({
              player: typeof stat.player === 'object' ? stat.player._id : stat.player,
              overs: stat.overs,
              balls: stat.balls || 0,
              runs: stat.runs,
              wickets: stat.wickets,
              wides: stat.wides || 0,
              noBalls: stat.noBalls || 0,
              economy: stat.economy || 0,
              lastBowledOver: stat.lastBowledOver
            })),
            currentState: inning.currentState || {
              currentOver: 0,
              currentBall: 0,
              lastBallRuns: 0
            },
            extras: {
              ...inning.extras,
              total: inning.extras.total || 0
            },
            runRate: inning.runRate || 0,
            requiredRunRate: inning.requiredRunRate
          }))
        };
      };

      const cleanedMatch = cleanMatchData(updatedMatch);

      console.log('Sending update with data:', cleanedMatch);
      const { data } = await matchService.updateScore(matchId, cleanedMatch);
      console.log('Update response:', data);
      
      // Update local state with the response data to keep in sync
      setMatch(data);
    } catch (error: any) {
      setError('Error updating match');
      console.error('Error updating match:', error?.response?.data || error?.message || error);
    }
  };

  const handleExtra = async (type: string, runs: number = 1) => {
    if (!match || !matchId) return;

    if (!isOverInProgress) {
      setError('Please start a new over first');
      return;
    }

    const updatedMatch = { ...match };
    // CRITICAL FIX: Ensure updatedMatch.currentInnings matches our state
    updatedMatch.currentInnings = currentInnings;
    const currentInning = updatedMatch.innings[currentInnings];

    // Initialize extras if not present
    if (!currentInning.extras) {
      currentInning.extras = {
        wides: 0,
        noBalls: 0,
        byes: 0,
        legByes: 0,
        total: 0
      };
    }

    // Update current state
    if (!currentInning.currentState) {
      currentInning.currentState = {
        currentOver: 0,
        currentBall: 0,
        lastBallRuns: runs
      };
    }

    let ballsToAdd = 0;
    
    switch (type) {
      case 'wide':
        currentInning.extras.wides += 1;
        currentInning.totalRuns += runs;
        currentInning.extras.total += runs;
        currentInning.currentState.lastBallRuns = runs;
        // Wide doesn't count as a ball
        ballsToAdd = 0;
        break;
      case 'noBall':
        currentInning.extras.noBalls += 1;
        currentInning.totalRuns += runs;
        currentInning.extras.total += runs;
        currentInning.currentState.lastBallRuns = runs;
        // No ball doesn't count as a ball
        ballsToAdd = 0;
        break;
      case 'bye':
        currentInning.extras.byes += runs;
        currentInning.totalRuns += runs;
        currentInning.extras.total += runs;
        currentInning.currentState.lastBallRuns = runs;
        // Bye counts as a ball
        ballsToAdd = 1;
        break;
      case 'legBye':
        currentInning.extras.legByes += runs;
        currentInning.totalRuns += runs;
        currentInning.extras.total += runs;
        currentInning.currentState.lastBallRuns = runs;
        // Leg bye counts as a ball
        ballsToAdd = 1;
        break;
    }

    // Update bowler stats for extras
    let bowlerBowlingStats = currentInning.bowlingStats.find(
      (stat) => typeof stat.player === 'string' ? stat.player === bowler : stat.player._id === bowler
    );
    
    if (!bowlerBowlingStats) {
      bowlerBowlingStats = {
        player: bowler,
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        wides: 0,
        noBalls: 0,
        economy: 0
      };
      currentInning.bowlingStats.push(bowlerBowlingStats);
    }

    // Update bowler's extra counts
    if (type === 'wide') {
      bowlerBowlingStats.wides += 1;
      bowlerBowlingStats.runs += runs;
    } else if (type === 'noBall') {
      bowlerBowlingStats.noBalls += 1;
      bowlerBowlingStats.runs += runs;
    } else {
      // For byes and leg byes, add runs but also count the ball
      bowlerBowlingStats.runs += runs;
      bowlerBowlingStats.balls += ballsToAdd;
      
      // Update innings balls and overs for legal deliveries
      currentInning.balls = (currentInning.balls || 0) + ballsToAdd;
      
      const totalInningsBalls = currentInning.balls;
      const completeInningsOvers = Math.floor(totalInningsBalls / 6);
      const remainingInningsBalls = totalInningsBalls % 6;
      currentInning.overs = completeInningsOvers + (remainingInningsBalls / 10);

      currentInning.currentState.currentBall = remainingInningsBalls;
      currentInning.currentState.currentOver = completeInningsOvers;

      // Check if over is complete for legal deliveries
      if (remainingInningsBalls === 0 && totalInningsBalls > 0) {
        setIsOverInProgress(false);
        setIsOverCompleted(true);
        setOverCompletionMessage(`Over ${completeInningsOvers} completed! Please select a new bowler and start the next over.`);
        
        if (bowlerBowlingStats) {
          bowlerBowlingStats.lastBowledOver = completeInningsOvers;
        }
      }
    }
    
    // Add extra ball to current over balls for commentary
    const extraBall: BallOutcome = {
      ballNumber: type === 'wide' || type === 'noBall' ? 0 : (currentOverBalls.length + 1), // Wides/no-balls = 0, byes/leg-byes = current ball position
      runs,
      isWicket: false,
      extras: {
        type: type as 'wide' | 'no-ball' | 'bye' | 'leg-bye',
        runs
      }
    };
    
    const newCurrentOverBalls = [...currentOverBalls, extraBall];
    setCurrentOverBalls(newCurrentOverBalls);
    
    // FIXED: Store current over balls in match data for persistence
    currentInning.currentOverBalls = newCurrentOverBalls;
    
    // Calculate overs and economy for bowler
    const totalBalls = bowlerBowlingStats.balls;
    const completeOvers = Math.floor(totalBalls / 6);
    const remainingBalls = totalBalls % 6;
    bowlerBowlingStats.overs = completeOvers + (remainingBalls / 10);
    
    if (totalBalls > 0) {
      const totalOversForEconomy = totalBalls / 6;
      bowlerBowlingStats.economy = totalOversForEconomy > 0 ? 
        bowlerBowlingStats.runs / totalOversForEconomy : 0;
    }

    // Rotate strike for odd runs in byes and leg byes
    if ((type === 'bye' || type === 'legBye') && runs % 2 === 1) {
      const temp = striker;
      setStriker(nonStriker);
      setNonStriker(temp);
      
      // Update strike status in batting stats
      if (currentInning.battingStats && Array.isArray(currentInning.battingStats)) {
        currentInning.battingStats.forEach(stat => {
          if (typeof stat.player === 'string') {
            stat.isOnStrike = stat.player === nonStriker;
          } else {
            stat.isOnStrike = stat.player._id === nonStriker;
          }
        });
      }
    }

    try {
      const cleanMatchData = (match: Match): Match => {
        return {
          ...match,
          team1: typeof match.team1 === 'object' ? match.team1._id : match.team1,
          team2: typeof match.team2 === 'object' ? match.team2._id : match.team2,
          currentInnings: match.currentInnings || 0,
          matchSettings: match.matchSettings || {
            oversPerBowler: 4,
            maxPlayersPerTeam: 11
          },
          bowlerRotation: match.bowlerRotation || {
            bowlerOversCount: {},
            availableBowlers: []
          },
          innings: match.innings.map(inning => ({
            battingTeam: typeof inning.battingTeam === 'object' ? inning.battingTeam._id : inning.battingTeam,
            bowlingTeam: typeof inning.bowlingTeam === 'object' ? inning.bowlingTeam._id : inning.bowlingTeam,
            totalRuns: inning.totalRuns,
            wickets: inning.wickets,
            overs: inning.overs,
            balls: inning.balls || 0,
            isCompleted: inning.isCompleted || false,
            battingStats: inning.battingStats.map(stat => ({
              player: typeof stat.player === 'object' ? stat.player._id : stat.player,
              runs: stat.runs,
              balls: stat.balls,
              fours: stat.fours,
              sixes: stat.sixes,
              isOut: stat.isOut,
              dismissalType: stat.dismissalType,
              howOut: stat.howOut,
              dismissedBy: stat.dismissedBy,
              strikeRate: stat.strikeRate || 0,
              isOnStrike: stat.isOnStrike || false
            })),
            bowlingStats: inning.bowlingStats.map(stat => ({
              player: typeof stat.player === 'object' ? stat.player._id : stat.player,
              overs: stat.overs,
              balls: stat.balls || 0,
              runs: stat.runs,
              wickets: stat.wickets,
              wides: stat.wides || 0,
              noBalls: stat.noBalls || 0,
              economy: stat.economy || 0,
              lastBowledOver: stat.lastBowledOver
            })),
            currentState: inning.currentState || {
              currentOver: 0,
              currentBall: 0,
              lastBallRuns: 0
            },
            extras: {
              ...inning.extras,
              total: inning.extras.total || 0
            },
            runRate: inning.runRate || 0,
            requiredRunRate: inning.requiredRunRate
          }))
        };
      };

      const cleanedMatch = cleanMatchData(updatedMatch);
      const { data } = await matchService.updateScore(matchId, cleanedMatch);
      setMatch(data);
    } catch (error: any) {
      setError('Error updating extras');
      console.error('Error updating extras:', error?.response?.data || error?.message || error);
    }
  };

  const handleWicket = async (type: string, howOut?: string, dismissedBy?: string) => {
    if (!match || !matchId) return;

    if (!isOverInProgress) {
      setError('Please start a new over first');
      return;
    }

    const updatedMatch = { ...match };
    // CRITICAL FIX: Ensure updatedMatch.currentInnings matches our state
    updatedMatch.currentInnings = currentInnings;
    const currentInning = updatedMatch.innings[currentInnings];

    // Update current state
    if (!currentInning.currentState) {
      currentInning.currentState = {
        currentOver: 0,
        currentBall: 0,
        lastBallRuns: 0
      };
    }

    // Update batting stats - mark striker as out
    const strikerBattingStats = currentInning.battingStats && Array.isArray(currentInning.battingStats)
      ? currentInning.battingStats.find((stat) => (typeof stat.player === 'string' ? stat.player : stat.player._id) === striker)
      : null;
    
    if (strikerBattingStats) {
      strikerBattingStats.isOut = true;
      strikerBattingStats.dismissalType = type;
      strikerBattingStats.howOut = howOut || type;
      strikerBattingStats.dismissedBy = dismissedBy;
      strikerBattingStats.balls += 1; // Wicket counts as a ball faced
      strikerBattingStats.strikeRate = strikerBattingStats.balls > 0 ? 
        (strikerBattingStats.runs / strikerBattingStats.balls) * 100 : 0;
    }

    // Update bowler stats
    let bowlerBowlingStats = currentInning.bowlingStats.find(
      (stat) => (typeof stat.player === 'string' ? stat.player : stat.player._id) === bowler
    );
    
    if (!bowlerBowlingStats) {
      bowlerBowlingStats = {
        player: bowler,
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        wides: 0,
        noBalls: 0,
        economy: 0
      };
      currentInning.bowlingStats.push(bowlerBowlingStats);
    }
    
    bowlerBowlingStats.wickets += 1;
    bowlerBowlingStats.balls += 1;
    
    // Calculate overs properly for bowler
    const totalBalls = bowlerBowlingStats.balls;
    const completeOvers = Math.floor(totalBalls / 6);
    const remainingBalls = totalBalls % 6;
    bowlerBowlingStats.overs = completeOvers + (remainingBalls / 10);
    
    // Calculate economy rate
    if (totalBalls > 0) {
      const totalOversForEconomy = totalBalls / 6;
      bowlerBowlingStats.economy = totalOversForEconomy > 0 ? 
        bowlerBowlingStats.runs / totalOversForEconomy : 0;
    }

    // Update innings totals
    currentInning.wickets += 1;
    currentInning.balls = (currentInning.balls || 0) + 1;
    
    // Calculate innings overs properly
    const totalInningsBalls = currentInning.balls;
    const completeInningsOvers = Math.floor(totalInningsBalls / 6);
    const remainingInningsBalls = totalInningsBalls % 6;
    currentInning.overs = completeInningsOvers + (remainingInningsBalls / 10);

    // Update current state
    currentInning.currentState.currentBall = remainingInningsBalls;
    currentInning.currentState.currentOver = completeInningsOvers;
    currentInning.currentState.lastBallRuns = 0; // Wicket = 0 runs

    // Add wicket ball to current over balls for commentary
    const wicketBall: BallOutcome = {
      ballNumber: currentOverBalls.length + 1, // Ball number within current over (1-6)
      runs: 0,
      isWicket: true,
      dismissalType: type as any,
      fielder: dismissedBy
    };
    
    const newCurrentOverBalls = [...currentOverBalls, wicketBall];
    setCurrentOverBalls(newCurrentOverBalls);
    
    // FIXED: Store current over balls in match data for persistence
    currentInning.currentOverBalls = newCurrentOverBalls;

    // Check if no more batsmen are available (for teams with less than 10 players)
    const availableBatsmen = getAvailableBatsmen();
    // Need at least 2 batsmen to continue (striker + non-striker)
    // Current striker is now out, so we need at least 2 remaining players
    const availableBatsmenCount = availableBatsmen.length;
    console.log('Available batsmen after wicket:', availableBatsmenCount, availableBatsmen.map(p => p.name));
    
    if (availableBatsmenCount < 2) {
      // Not enough batsmen to continue - innings ends
      currentInning.isCompleted = true;
      
      if (currentInnings === 0) {
        // First innings completed due to no more batsmen
        setIsFirstInningsComplete(true);
        setOverCompletionMessage(`First innings completed! All out for ${currentInning.totalRuns} runs in ${currentInning.overs.toFixed(1)} overs. (${currentInning.wickets} wickets, not enough batsmen to continue)`);
        setIsOverCompleted(true);
        setIsOverInProgress(false);
        setIsWaitingForNewBatsman(false);
        setIsWicketDialogOpen(false);
        
        // Save the match state and return - user will start second innings manually
        try {
          const cleanedMatch = cleanMatchData(updatedMatch);
          await matchService.updateScore(matchId, cleanedMatch);
          setMatch(updatedMatch);
        } catch (error: any) {
          setError('Error saving innings completion');
          console.error('Error:', error);
        }
        return;
      } else {
        // Second innings completed due to no more batsmen - match ends
        updatedMatch.status = 'completed';
        const firstInnings = updatedMatch.innings[0];
        const runsDifference = (firstInnings.totalRuns || 0) - currentInning.totalRuns;
        const firstInningsBattingTeam = typeof firstInnings.battingTeam === 'object' && firstInnings.battingTeam
          ? firstInnings.battingTeam.name 
          : 'Team 1';
        updatedMatch.result = `${firstInningsBattingTeam} won by ${runsDifference} runs`;
        
        setIsMatchCompleted(true);
        setOverCompletionMessage(`Match completed! ${firstInningsBattingTeam} won by ${runsDifference} runs. All out for ${currentInning.totalRuns} runs. (${currentInning.wickets} wickets, not enough batsmen to continue)`);
        setIsOverCompleted(true);
        setIsOverInProgress(false);
        setIsWaitingForNewBatsman(false);
        setIsWicketDialogOpen(false);
        
        // Save the completed match and return
        try {
          const cleanedMatch = cleanMatchData(updatedMatch);
          await matchService.updateScore(matchId, cleanedMatch);
          setMatch(updatedMatch);
        } catch (error: any) {
          setError('Error saving match completion');
          console.error('Error:', error);
        }
        return;
      }
    }

    // Check if all batsmen are out (10 wickets) - innings should end
    if (currentInning.wickets >= 10) {
      currentInning.isCompleted = true;
      
      if (currentInnings === 0) {
        // First innings completed due to all out
        setIsFirstInningsComplete(true);
        setOverCompletionMessage(`First innings completed! All out for ${currentInning.totalRuns} runs in ${currentInning.overs.toFixed(1)} overs.`);
        setIsOverCompleted(true);
        setIsOverInProgress(false);
        setIsWaitingForNewBatsman(false);
        setIsWicketDialogOpen(false);
        
        // Save the match state and return - user will start second innings manually
        try {
          const cleanedMatch = cleanMatchData(updatedMatch);
          await matchService.updateScore(matchId, cleanedMatch);
          setMatch(updatedMatch);
        } catch (error: any) {
          setError('Error saving innings completion');
          console.error('Error:', error);
        }
        return;
      } else {
        // Second innings completed due to all out - match ends
        updatedMatch.status = 'completed';
        const firstInnings = updatedMatch.innings[0];
        const runsDifference = (firstInnings.totalRuns || 0) - currentInning.totalRuns;
        const firstInningsBattingTeam = typeof firstInnings.battingTeam === 'object' && firstInnings.battingTeam
          ? firstInnings.battingTeam.name 
          : 'Team 1';
        updatedMatch.result = `${firstInningsBattingTeam} won by ${runsDifference} runs`;
        
        setIsMatchCompleted(true);
        setOverCompletionMessage(`Match completed! ${firstInningsBattingTeam} won by ${runsDifference} runs. All out for ${currentInning.totalRuns} runs.`);
        setIsOverCompleted(true);
        setIsOverInProgress(false);
        setIsWaitingForNewBatsman(false);
        setIsWicketDialogOpen(false);
        
        // Save the completed match and return
        try {
          const cleanedMatch = cleanMatchData(updatedMatch);
          await matchService.updateScore(matchId, cleanedMatch);
          setMatch(updatedMatch);
        } catch (error: any) {
          setError('Error saving match completion');
          console.error('Error:', error);
        }
        return;
      }
    }

    // Check if over is complete - but don't set over completion state if waiting for new batsman
    // This will be handled after new batsman is selected
    if (remainingInningsBalls === 0 && totalInningsBalls > 0) {
      // Mark that over is logically complete but don't trigger over completion UI yet
      if (bowlerBowlingStats) {
        bowlerBowlingStats.lastBowledOver = completeInningsOvers;
      }
      // Over completion state will be set in handleBatsmanChange after new striker is selected
    }

    try {
      const cleanMatchData = (match: Match): Match => {
        return {
          ...match,
          team1: typeof match.team1 === 'object' ? match.team1._id : match.team1,
          team2: typeof match.team2 === 'object' ? match.team2._id : match.team2,
          currentInnings: match.currentInnings || 0,
          matchSettings: match.matchSettings || {
            oversPerBowler: 4,
            maxPlayersPerTeam: 11
          },
          bowlerRotation: match.bowlerRotation || {
            bowlerOversCount: {},
            availableBowlers: []
          },
          innings: match.innings.map(inning => ({
            battingTeam: typeof inning.battingTeam === 'object' ? inning.battingTeam._id : inning.battingTeam,
            bowlingTeam: typeof inning.bowlingTeam === 'object' ? inning.bowlingTeam._id : inning.bowlingTeam,
            totalRuns: inning.totalRuns,
            wickets: inning.wickets,
            overs: inning.overs,
            balls: inning.balls || 0,
            isCompleted: inning.isCompleted || false,
            battingStats: inning.battingStats.map(stat => ({
              player: typeof stat.player === 'object' ? stat.player._id : stat.player,
              runs: stat.runs,
              balls: stat.balls,
              fours: stat.fours,
              sixes: stat.sixes,
              isOut: stat.isOut,
              dismissalType: stat.dismissalType,
              howOut: stat.howOut,
              dismissedBy: stat.dismissedBy,
              strikeRate: stat.strikeRate || 0,
              isOnStrike: stat.isOnStrike || false
            })),
            bowlingStats: inning.bowlingStats.map(stat => ({
              player: typeof stat.player === 'object' ? stat.player._id : stat.player,
              overs: stat.overs,
              balls: stat.balls || 0,
              runs: stat.runs,
              wickets: stat.wickets,
              wides: stat.wides || 0,
              noBalls: stat.noBalls || 0,
              economy: stat.economy || 0,
              lastBowledOver: stat.lastBowledOver
            })),
            currentState: inning.currentState || {
              currentOver: 0,
              currentBall: 0,
              lastBallRuns: 0
            },
            extras: {
              ...inning.extras,
              total: inning.extras.total || 0
            },
            runRate: inning.runRate || 0,
            requiredRunRate: inning.requiredRunRate
          }))
        };
      };

      // Check if match should end (for second innings)
      const matchEnded = checkMatchEnd(updatedMatch);
      if (matchEnded) {
        // Save the match state with the result
        const cleanedMatch = cleanMatchData(updatedMatch);
        await matchService.updateScore(matchId, cleanedMatch);
        setMatch(updatedMatch);
        
        // Show match result and stop further actions
        setOverCompletionMessage(updatedMatch.result || 'Match completed!');
        setIsOverCompleted(true);
        setIsOverInProgress(false);
        setIsWicketDialogOpen(false);
        setIsMatchCompleted(true);
        
        return;
      }

      const cleanedMatch = cleanMatchData(updatedMatch);
      const { data } = await matchService.updateScore(matchId, cleanedMatch);
      setMatch(data);
      setIsWicketDialogOpen(false);
      
      // Set waiting for new batsman state
      setIsWaitingForNewBatsman(true);
      
      // Reset striker selection since the batsman is out
      setStriker('');
      
      // Update local stats
      setStrikerStats({ runs: 0, balls: 0 });
      setWicketDetails(null);
    } catch (error: any) {
      setError('Error recording wicket');
      console.error('Error recording wicket:', error?.response?.data || error?.message || error);
    }
  };

  const handleBatsmanChange = (event: SelectChangeEvent) => {
    const newStriker = event.target.value;
    setStriker(newStriker);
    
    // Clear waiting for new batsman state when new striker is selected
    if (isWaitingForNewBatsman) {
      setIsWaitingForNewBatsman(false);
      
      // Reset striker stats for fresh start
      setStrikerStats({ runs: 0, balls: 0 });
      
      // Check if over was completed after wicket (6th ball)
      if (match && match.innings && match.innings.length > 0) {
        const currentInning = match.innings[currentInnings];
        const totalInningsBalls = currentInning.balls || 0;
        const remainingInningsBalls = totalInningsBalls % 6;
        const completeInningsOvers = Math.floor(totalInningsBalls / 6);
        
        // If over was completed (wicket on 6th ball), now set over completion state
        if (remainingInningsBalls === 0 && totalInningsBalls > 0) {
          setIsOverInProgress(false);
          
          // Check if innings should end (reached fixed overs)
          if (completeInningsOvers >= match.overs) {
            // Innings completed!
            currentInning.isCompleted = true;
            
            if (currentInnings === 0) {
              // First innings completed, start second innings
              setOverCompletionMessage(`First innings completed! ${completeInningsOvers} overs bowled. Starting second innings...`);
              
              // Switch teams for second innings
              const newInnings: any = {
                battingTeam: currentInning.bowlingTeam,
                bowlingTeam: currentInning.battingTeam,
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
              };
              
              // Add new innings to match
              const updatedMatch = { ...match };
              updatedMatch.innings.push(newInnings);
              updatedMatch.currentInnings = 1;
              setMatch(updatedMatch);
              
              // Reset batting/bowling selections for new innings
              setStriker('');
              setNonStriker('');
              setBowler('');
              setIsOverCompleted(true);
              
              // CRITICAL FIX: Clear current over balls for innings completion after wicket
              setCurrentOverBalls([]);
              if (match && match.innings && match.innings[currentInnings]) {
                match.innings[currentInnings].currentOverBalls = [];
              }
            } else {
              // Second innings completed, match finished
              setOverCompletionMessage(`Match completed! Second innings finished after ${completeInningsOvers} overs.`);
              setIsOverCompleted(true);
              
              // CRITICAL FIX: Clear current over balls for match completion after wicket
              setCurrentOverBalls([]);
              if (match && match.innings && match.innings[currentInnings]) {
                match.innings[currentInnings].currentOverBalls = [];
              }
            }
          } else {
            // Just over completed, continue with same innings
            setIsOverCompleted(true);
            setOverCompletionMessage(`Over ${completeInningsOvers} completed! Please select a new bowler and start the next over.`);
            
            // CRITICAL FIX: Clear current over balls when over completes after wicket
            // This prevents old over information from persisting into the new over
            setCurrentOverBalls([]);
            if (match && match.innings && match.innings[currentInnings]) {
              match.innings[currentInnings].currentOverBalls = [];
            }
          }
        }
        
        // Sync with actual match data if the player already has stats
        const newStrikerStats = currentInning.battingStats && Array.isArray(currentInning.battingStats)
          ? currentInning.battingStats.find((stat) => typeof stat.player === 'string' ? stat.player === newStriker : stat.player._id === newStriker)
          : null;
        
        if (newStrikerStats) {
          setStrikerStats({
            runs: newStrikerStats.runs,
            balls: newStrikerStats.balls
          });
        }
      }
    }
  };

  const handleNonStrikerChange = (event: SelectChangeEvent) => {
    setNonStriker(event.target.value);
  };

  const handleBowlerChange = (event: SelectChangeEvent) => {
    const newBowlerId = event.target.value;
    
    // Check if changing bowler mid-over
    if (isOverInProgress && currentOverBalls.length > 0 && !allowBowlerChange) {
      // Show dialog instead of alert for better UX
      setPendingBowlerChange(newBowlerId);
      setIsBowlerChangeDialogOpen(true);
      return;
    }
    
    const previousBowler = bowler;
    setBowler(newBowlerId);
    
    // Track bowlers used in current over for proper rotation
    if (isOverInProgress && previousBowler && previousBowler !== newBowlerId) {
      setBowlersUsedInCurrentOver(prev => {
        const updated = [...prev];
        if (!updated.includes(previousBowler)) {
          updated.push(previousBowler);
        }
        if (!updated.includes(newBowlerId)) {
          updated.push(newBowlerId);
        }
        return updated;
      });
    }
    
    // Clear over completion state when new bowler is selected
    if (isOverCompleted) {
      setIsOverCompleted(false);
      setOverCompletionMessage('');
    }
    
    // Reset mid-over change permission after use
    if (allowBowlerChange) {
      setAllowBowlerChange(false);
      setBowlerChangeReason('');
    }
  };

  const handleAllowBowlerChange = (reason: string) => {
    setAllowBowlerChange(true);
    setBowlerChangeReason(reason);
    setIsBowlerChangeDialogOpen(false);
    
    // Apply the pending bowler change
    if (pendingBowlerChange) {
      const previousBowler = bowler;
      setBowler(pendingBowlerChange);
      
      // Track bowlers used in current over for proper rotation
      if (isOverInProgress && previousBowler && previousBowler !== pendingBowlerChange) {
        setBowlersUsedInCurrentOver(prev => {
          const updated = [...prev];
          if (!updated.includes(previousBowler)) {
            updated.push(previousBowler);
          }
          if (!updated.includes(pendingBowlerChange)) {
            updated.push(pendingBowlerChange);
          }
          return updated;
        });
      }
      
      setPendingBowlerChange('');
    }
  };

  const handleCancelBowlerChange = () => {
    setIsBowlerChangeDialogOpen(false);
    setPendingBowlerChange('');
  };

  const handleStartSecondInnings = async () => {
    if (!match || !matchId) return;
    
    // For second innings, the batting team is the bowling team from first innings
    const firstInnings = match.innings[0];
    if (!firstInnings) return;
    
    // Get the second innings batting team ID (which was the bowling team in first innings)
    let secondInningsBattingTeamId: string | undefined;
    
    if (typeof firstInnings.bowlingTeam === 'string') {
      secondInningsBattingTeamId = firstInnings.bowlingTeam;
    } else if (firstInnings.bowlingTeam && firstInnings.bowlingTeam._id) {
      secondInningsBattingTeamId = firstInnings.bowlingTeam._id;
    } else {
      return;
    }
    
    // Count all players from that team
    const teamPlayers = players.filter(player => {
      if (!player.teams || !Array.isArray(player.teams)) return false;
      
      return player.teams.some(team => {
        const teamId = typeof team === 'string' ? team : team._id;
        return teamId === secondInningsBattingTeamId;
      });
    });
    
    if (teamPlayers.length < 2) {
      setError(`Second innings cannot start - only ${teamPlayers.length} available batsmen. Match will end.`);
      setIsMatchCompleted(true);
      setOverCompletionMessage(`Match completed - not enough batsmen for second innings (${teamPlayers.length} available).`);
      setIsOverCompleted(true);
      return;
    }
    
    // Continue with second innings start
    startSecondInningsFlow();
  };
  
  const startSecondInningsFlow = async () => {
    if (!match || !matchId) return;
    
    try {
      // Switch to second innings
      const updatedMatch = { ...match };
      updatedMatch.currentInnings = 1;
      
      // Ensure second innings exists - if not, create it
      if (!updatedMatch.innings[1]) {
        const firstInnings = updatedMatch.innings[0];
        const newInnings: any = {
          battingTeam: firstInnings.bowlingTeam,
          bowlingTeam: firstInnings.battingTeam,
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
          runRate: 0,
          currentOverBalls: []
        };
        updatedMatch.innings.push(newInnings);
      }
      
      // Save the innings transition to server
      const cleanMatchData = (match: Match): Match => {
        return {
          ...match,
          team1: typeof match.team1 === 'object' ? match.team1._id : match.team1,
          team2: typeof match.team2 === 'object' ? match.team2._id : match.team2,
          currentInnings: updatedMatch.currentInnings, // Use the updated currentInnings
          innings: match.innings.map(inning => ({
            battingTeam: typeof inning.battingTeam === 'object' ? inning.battingTeam._id : inning.battingTeam,
            bowlingTeam: typeof inning.bowlingTeam === 'object' ? inning.bowlingTeam._id : inning.bowlingTeam,
            totalRuns: inning.totalRuns,
            wickets: inning.wickets,
            overs: inning.overs,
            balls: inning.balls || 0,
            isCompleted: inning.isCompleted || false,
            battingStats: inning.battingStats || [],
            bowlingStats: inning.bowlingStats || [],
            currentState: inning.currentState || {
              currentOver: 0,
              currentBall: 0,
              lastBallRuns: 0
            },
            extras: inning.extras || {
              wides: 0,
              noBalls: 0,
              byes: 0,
              legByes: 0,
              total: 0
            },
            runRate: inning.runRate || 0
          }))
        };
      };

      const cleanedMatch = cleanMatchData(updatedMatch);
      const { data } = await matchService.updateScore(matchId, cleanedMatch);
      
      // Update states for second innings
      setMatch(data);
      setCurrentInnings(1);
      setIsFirstInningsComplete(false);
      setOverCompletionMessage('');
      
      // Reset player selections for second innings
      setStriker('');
      setNonStriker('');
      setBowler('');
      setCurrentOverBalls([]);
      setIsOverInProgress(false);
      setIsOverCompleted(false);
      
      // Open player selection dialog for second innings
      setIsPlayerSelectionDialogOpen(true);
      
    } catch (error) {
      console.error('Error starting second innings:', error);
    }
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!match) return <Typography>Match not found</Typography>;

  // Show innings transition screen when first innings is complete
  if (isFirstInningsComplete && currentInnings === 0) {
    const firstInning = match.innings[0];
    const firstInningBattingTeam = typeof firstInning?.battingTeam === 'object' && firstInning.battingTeam
      ? firstInning.battingTeam.name 
      : 'Team 1';
    const firstInningBowlingTeam = typeof firstInning?.bowlingTeam === 'object' && firstInning.bowlingTeam
      ? firstInning.bowlingTeam.name 
      : 'Team 2';

    return (
      <Container maxWidth="lg">
        <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', p: 3 }}>
          <Paper elevation={6} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
            <Typography variant="h3" sx={{ mb: 3, color: '#2c3e50', fontWeight: 'bold' }}>
              🏏 First Innings Complete!
            </Typography>
            
            <Box sx={{ mb: 4, p: 3, backgroundColor: '#e8f5e8', borderRadius: 2 }}>
              <Typography variant="h4" sx={{ mb: 2, color: '#2e7d32' }}>
                {firstInningBattingTeam}: {firstInning?.totalRuns}/{firstInning?.wickets}
              </Typography>
              <Typography variant="h6" sx={{ color: '#4caf50' }}>
                Overs: {firstInning?.overs} | Run Rate: {(firstInning?.runRate || 0).toFixed(2)}
              </Typography>
            </Box>

            <Typography variant="h5" sx={{ mb: 3, color: '#2c3e50' }}>
              {firstInningBowlingTeam} to bat next
            </Typography>

            <Typography variant="body1" sx={{ mb: 4, color: '#666' }}>
              Target: {(firstInning?.totalRuns || 0) + 1} runs in {match.overs} overs
            </Typography>

            <Button
              variant="contained"
              size="large"
              sx={{
                px: 6,
                py: 2,
                fontSize: '1.2rem',
                borderRadius: 3,
                background: 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #388e3c 30%, #4caf50 90%)',
                  transform: 'translateY(-2px)',
                },
              }}
              onClick={handleStartSecondInnings}
            >
              🚀 Start Second Innings
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  const currentInning = match.innings[currentInnings];
  
  // If currentInning is undefined (during innings transition), show loading or return early
  if (!currentInning) {
    return (
      <Container>
        <Typography>Loading innings data...</Typography>
      </Container>
    );
  }
  
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
    <Container 
      maxWidth="lg" 
      sx={{ 
        px: isMobile ? 0 : 3, // Remove padding on mobile for full screen usage
        py: isMobile ? 0 : 2
      }}
    >
      <Box 
        sx={{ 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          p: isMobile ? 1 : 3, // Reduced padding for mobile
          mx: isMobile ? 0 : 0 // Removed negative margin
        }}
      >
      <Paper 
        elevation={8}
        sx={{ 
          p: isMobile ? 2 : 4, // Reduced padding for mobile
          borderRadius: 3,
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}
      >
        <Typography 
          variant="h3" 
          gutterBottom 
          sx={{ 
            fontWeight: 'bold',
            textAlign: 'center',
            color: '#2c3e50',
            mb: 2,
            textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          🏏 {`${typeof match.team1 === 'object' && match.team1 ? match.team1.name : match.team1} vs ${typeof match.team2 === 'object' && match.team2 ? match.team2.name : match.team2}`}
        </Typography>

        {/* Innings Indicator */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 'bold',
              color: currentInnings === 0 ? '#1976d2' : '#ff5722',
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
              mb: 1
            }}
          >
            {currentInnings === 0 ? '🥇 First Innings' : '🥈 Second Innings'}
          </Typography>
          {currentInnings === 1 && (
            <Alert 
              severity="success" 
              sx={{ 
                maxWidth: '600px',
                mx: 'auto',
                borderRadius: 2,
                '& .MuiAlert-message': { textAlign: 'center', width: '100%' }
              }}
            >
              <AlertTitle sx={{ fontWeight: 'bold' }}>🔄 Second Innings Started!</AlertTitle>
              Teams have been swapped. {typeof currentInning?.battingTeam === 'object' && currentInning.battingTeam ? currentInning.battingTeam.name : currentInning?.battingTeam} is now batting.
            </Alert>
          )}
        </Box>

      {/* Viewer Mode Alert */}
      {!isAdmin && (
        <Alert 
          severity="info" 
          sx={{ 
            mb: 3, 
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
            border: '1px solid',
            borderColor: 'info.main',
            '& .MuiAlert-message': { width: '100%' },
            background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(21, 101, 192, 0.1) 100%)'
          }}
        >
          <AlertTitle sx={{ fontWeight: 'bold', color: 'info.main' }}>
            👀 Viewer Mode
          </AlertTitle>
          You are in viewer mode. You can watch the live scoring but cannot make any changes to the match.
        </Alert>
      )}

      {/* Over Completion Alert */}
      {isOverCompleted && (
        <Alert 
          severity="warning" 
          sx={{ 
            mb: 3, 
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
            border: '1px solid',
            borderColor: 'warning.main',
            '& .MuiAlert-message': { width: '100%' },
            '& .MuiAlert-icon': { fontSize: '1.5rem' }
          }}
        >
          <AlertTitle>Over Completed!</AlertTitle>
          {overCompletionMessage}
          <br />
          <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
            Please select a new bowler from the dropdown below to continue.
          </Typography>
        </Alert>
      )}

      {/* Waiting for New Batsman Alert */}
      {isWaitingForNewBatsman && (
        <Alert 
          severity="info" 
          sx={{ 
            mb: 3, 
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
            border: '1px solid',
            borderColor: 'info.main',
            background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(21, 101, 192, 0.1) 100%)',
            '& .MuiAlert-message': { width: '100%' },
            '& .MuiAlert-icon': { fontSize: '1.5rem' }
          }}
        >
          <AlertTitle>Wicket Recorded!</AlertTitle>
          A batsman is out. Please select a new striker from the dropdown below to continue.
          <br />
          <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
            All scoring options are disabled until new batsman is selected.
          </Typography>
        </Alert>
      )}

      {/* Start/Continue Match Button - Show when players not selected or match needs to start */}
      {isAdmin && !arePlayersSelected() && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleStartOrContinueMatch}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              borderRadius: 3,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2 30%, #2196F3 90%)',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 16px rgba(33, 150, 243, 0.5)',
              },
            }}
          >
            🏏 {match.innings.length > 1 && currentInnings === 1 ? 'Continue Match' : 'Start Match'}
          </Button>
        </Box>
      )}

      {/* Score Summary */}
      <Paper sx={{ p: 2, mb: 3 }} component="div">
        {/* Comprehensive Innings Display */}
        {match.innings.length > 1 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, textAlign: 'center', fontWeight: 'bold' }}>
              🏏 Match Scorecard
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              {/* First Innings */}
              <Paper sx={{ p: 2, backgroundColor: currentInnings === 0 ? '#e3f2fd' : '#f5f5f5' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  1st Innings{currentInnings === 0 && ' (Current)'}
                </Typography>
                <Typography variant="h6" sx={{ color: '#1976d2' }}>
                  {match.innings[0]?.totalRuns || 0}/{match.innings[0]?.wickets || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Overs: {match.innings[0]?.overs || 0}
                </Typography>
              </Paper>
              
              {/* Second Innings */}
              <Paper sx={{ p: 2, backgroundColor: currentInnings === 1 ? '#e8f5e8' : '#f5f5f5' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  2nd Innings{currentInnings === 1 && ' (Current)'}
                </Typography>
                <Typography variant="h6" sx={{ color: currentInnings === 1 ? '#2e7d32' : '#666' }}>
                  {match.innings[1]?.totalRuns || 0}/{match.innings[1]?.wickets || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Overs: {match.innings[1]?.overs || 0}
                  {currentInnings === 1 && match.innings[0] && (
                    <span style={{ marginLeft: 8, fontWeight: 'bold', color: '#d32f2f' }}>
                      Need {((match.innings[0].totalRuns || 0) + 1) - (match.innings[1]?.totalRuns || 0)} more
                    </span>
                  )}
                </Typography>
              </Paper>
            </Box>
          </Box>
        )}

        {/* Current Innings Detail */}
        <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
          {currentInnings === 0 ? '1st Innings' : '2nd Innings'} - Current Over
        </Typography>
          <MatchDetails
          totalRuns={currentInning?.totalRuns || 0}
          wickets={currentInning?.wickets || 0}
          overs={currentInning?.overs || 0}
          totalBalls={currentInning?.balls || 0}
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
            wickets: bowlerStats.wickets,
            balls: bowlerStats.balls || 0
          }}
        />
      </Paper>

      {/* Player Selection - Hidden from main UI, only shown in dialog when needed */}
      {false && (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
        <Autocomplete
          fullWidth
          options={players
            .filter(player => {
              // Check if player has teams and battingTeamId exists
              if (!player.teams || !Array.isArray(player.teams) || !battingTeamId) return false;
              
              // Check if player belongs to batting team (using teams array)
              const hasTeam = player.teams.some(team => {
                const teamId = typeof team === 'string' ? team : team._id;
                return teamId === String(battingTeamId);
              });
              
              // Check if player is out
              const isPlayerOut = currentInning.battingStats && Array.isArray(currentInning.battingStats)
                ? currentInning.battingStats.some(stat => {
                    const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id;
                    return playerId === player._id && stat.isOut;
                  })
                : false;
              
              // Don't allow same player as non-striker
              const isSameAsNonStriker = player._id === nonStriker;
              
              return hasTeam && !isPlayerOut && !isSameAsNonStriker;
            })}
          getOptionLabel={(option) => option.name}
          value={players.find(p => p._id === striker) || null}
          onChange={(event, newValue) => {
            if (newValue && newValue._id) {
              handleBatsmanChange({ target: { value: newValue._id } } as SelectChangeEvent);
            }
          }}
          disabled={!isAdmin || (isOverCompleted && !isWaitingForNewBatsman)}
          renderInput={(params) => (
            <TextField 
              {...params} 
              label={`Striker ${isWaitingForNewBatsman ? '(SELECT NEW BATSMAN!)' : ''}`}
              sx={{
                '& .MuiOutlinedInput-root': isWaitingForNewBatsman ? {
                  backgroundColor: 'warning.light',
                  '&:hover': { backgroundColor: 'warning.light' }
                } : {}
              }}
            />
          )}
          renderOption={(props, option) => (
            <Box component="li" {...props}>
              <Typography>{option.name}</Typography>
            </Box>
          )}
        />

        <Autocomplete
          fullWidth
          options={players
            .filter(player => {
              // Check if player has teams and battingTeamId exists
              if (!player.teams || !Array.isArray(player.teams) || !battingTeamId) return false;
              
              // Check if player belongs to batting team (using teams array)
              const hasTeam = player.teams.some(team => {
                const teamId = typeof team === 'string' ? team : team._id;
                return teamId === String(battingTeamId);
              });
              
              // Check if player is out
              const isPlayerOut = currentInning.battingStats && Array.isArray(currentInning.battingStats)
                ? currentInning.battingStats.some(stat => {
                    const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id;
                    return playerId === player._id && stat.isOut;
                  })
                : false;
              
              // Don't allow same player as striker
              const isSameAsStriker = player._id === striker;
              
              return hasTeam && !isPlayerOut && !isSameAsStriker;
            })}
          getOptionLabel={(option) => option.name}
          value={players.find(p => p._id === nonStriker) || null}
          onChange={(event, newValue) => {
            if (newValue && newValue._id) {
              handleNonStrikerChange({ target: { value: newValue._id } } as SelectChangeEvent);
            }
          }}
          disabled={!isAdmin || isOverCompleted || isWaitingForNewBatsman}
          renderInput={(params) => (
            <TextField 
              {...params} 
              label="Non-Striker"
            />
          )}
          renderOption={(props, option) => (
            <Box component="li" {...props}>
              <Typography>{option.name}</Typography>
            </Box>
          )}
        />

        <Autocomplete
          fullWidth
          options={players
            .filter(player => {
              // Check if player has teams and bowlingTeamId exists
              if (!player.teams || !Array.isArray(player.teams) || !bowlingTeamId) return false;
              
              // Check if player belongs to bowling team (using teams array)
              const hasTeam = player.teams.some(team => {
                const teamId = typeof team === 'string' ? team : team._id;
                return teamId === String(bowlingTeamId);
              });
              return hasTeam;
            })
            .sort((a, b) => {
              // FIXED: Smart sorting for bowler rotation when over completed
              if (isOverCompleted && bowlersUsedInCurrentOver.length > 0) {
                const aUsedInCurrentOver = bowlersUsedInCurrentOver.includes(a._id || '');
                const bUsedInCurrentOver = bowlersUsedInCurrentOver.includes(b._id || '');
                
                // Prioritize bowlers who haven't bowled in current over
                if (!aUsedInCurrentOver && bUsedInCurrentOver) return -1;
                if (aUsedInCurrentOver && !bUsedInCurrentOver) return 1;
              }
              
              // Default alphabetical sort
              return (a.name || '').localeCompare(b.name || '');
            })}
          getOptionLabel={(option) => {
            const usedInCurrentOver = isOverCompleted && bowlersUsedInCurrentOver.includes(option._id || '');
            return `${option.name}${usedInCurrentOver ? ' ⚠️ (Used in last over)' : ''}`;
          }}
          value={players.find(p => p._id === bowler) || null}
          onChange={(event, newValue) => {
            if (newValue && newValue._id) {
              handleBowlerChange({ target: { value: newValue._id } } as SelectChangeEvent);
            }
          }}
          disabled={!isAdmin || isWaitingForNewBatsman}
          renderInput={(params) => (
            <TextField 
              {...params} 
              label={`Bowler ${isOverCompleted ? '(SELECT NEW BOWLER!)' : ''}${allowBowlerChange && bowlerChangeReason ? ` - ${bowlerChangeReason}` : ''}`}
              sx={{
                '& .MuiOutlinedInput-root': isOverCompleted ? {
                  backgroundColor: 'warning.light',
                  '&:hover': { backgroundColor: 'warning.light' }
                } : {}
              }}
            />
          )}
          renderOption={(props, option) => {
            const usedInCurrentOver = isOverCompleted && bowlersUsedInCurrentOver.includes(option._id || '');
            return (
              <Box component="li" {...props}>
                <Typography>
                  {option.name}
                  {usedInCurrentOver && ' ⚠️ (Used in last over)'}
                </Typography>
              </Box>
            );
          }}
        />

        {allowBowlerChange && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            <AlertTitle>Bowler Change Allowed</AlertTitle>
            Reason: {bowlerChangeReason}. You can now select a new bowler.
          </Alert>
        )}

        {/* Show rotation guidance when multiple bowlers used in previous over */}
        {isOverCompleted && bowlersUsedInCurrentOver.length > 1 && (
          <Alert severity="info" sx={{ mt: 1 }}>
            <AlertTitle>Bowler Rotation Notice</AlertTitle>
            Multiple bowlers ({bowlersUsedInCurrentOver.length}) were used in the previous over. 
            Consider selecting a fresh bowler who hasn't bowled recently for the next over.
          </Alert>
        )}
      </Box>
      )}

      {/* Scoring Buttons */}
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h6" 
          gutterBottom 
          sx={{ 
            color: '#2c3e50',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
            mb: 2
          }}
        >
          🎯 Quick Scoring
        </Typography>
        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)',
            gap: 2
          }}
        >
          {[0, 1, 2, 3, 4, 6].map((runs) => (
            <Button 
              key={runs}
              variant="contained" 
              onClick={() => handleBallOutcome(runs)}
              disabled={!isAdmin || isOverCompleted || !isOverInProgress || isWaitingForNewBatsman || !striker || !nonStriker || !bowler || isMatchCompleted}
              sx={{
                minHeight: isMobile ? '50px' : '60px',
                borderRadius: '12px',
                fontSize: isMobile ? '1.2rem' : '1.5rem',
                fontWeight: 'bold',
                background: runs === 0 
                  ? 'linear-gradient(45deg, #666 30%, #999 90%)'
                  : runs >= 4 
                    ? 'linear-gradient(45deg, #FF6B6B 30%, #FF5722 90%)'
                    : 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                '&:disabled': {
                  background: 'linear-gradient(45deg, #ccc 30%, #ddd 90%)',
                  color: '#888',
                }
              }}
            >
              {runs}
            </Button>
          ))}
          <Button
            variant="contained"
            color="error"
            onClick={() => setIsWicketDialogOpen(true)}
            disabled={!isAdmin || isOverCompleted || !isOverInProgress || isWaitingForNewBatsman || !striker || !nonStriker || !bowler || isMatchCompleted}
            sx={{
              minHeight: isMobile ? '50px' : '60px',
              borderRadius: '12px',
              fontSize: isMobile ? '1.2rem' : '1.5rem',
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #f44336 30%, #d32f2f 90%)',
              boxShadow: '0 4px 8px rgba(244, 67, 54, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 12px rgba(244, 67, 54, 0.4)',
                background: 'linear-gradient(45deg, #d32f2f 30%, #b71c1c 90%)',
              },
              '&:active': {
                transform: 'translateY(0)',
              }
            }}
          >
            W
          </Button>
        </Box>
      </Box>

      {/* Extras Buttons */}
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h6" 
          gutterBottom 
          sx={{ 
            color: '#2c3e50',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
            mb: 2
          }}
        >
          ⚡ Extras
        </Typography>
        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: 2
          }}
        >
          <Button 
            variant="outlined" 
            onClick={() => {
              setExtraType('wide');
              setExtraRuns(1);
              setIsExtraRunsDialogOpen(true);
            }}
            disabled={!isAdmin || isOverCompleted || !isOverInProgress || isWaitingForNewBatsman || !striker || !nonStriker || !bowler || isMatchCompleted}
            sx={{
              minHeight: isMobile ? '45px' : '50px',
              borderRadius: '10px',
              fontWeight: 'bold',
              color: '#FF9800', // Changed to more visible orange color
              borderColor: '#FFB74D',
              background: 'rgba(255, 183, 77, 0.1)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(45deg, #FFB74D 30%, #FFA726 90%)',
                borderColor: '#FFA726',
                color: '#fff', // White text on hover
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 8px rgba(255, 183, 77, 0.3)',
              },
              '&:disabled': {
                color: 'rgba(255, 152, 0, 0.5)', // Visible disabled state
                borderColor: 'rgba(255, 183, 77, 0.3)',
              }
            }}
          >
            Wide
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => {
              setExtraType('noBall');
              setExtraRuns(1);
              setIsExtraRunsDialogOpen(true);
            }}
            disabled={!isAdmin || isOverCompleted || !isOverInProgress || isWaitingForNewBatsman || !striker || !nonStriker || !bowler || isMatchCompleted}
            sx={{
              minHeight: isMobile ? '45px' : '50px',
              borderRadius: '10px',
              fontWeight: 'bold',
              color: '#FF5722', // Changed to more visible red-orange color
              borderColor: '#FF8A65',
              background: 'rgba(255, 138, 101, 0.1)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(45deg, #FF8A65 30%, #FF7043 90%)',
                borderColor: '#FF7043',
                color: '#fff', // White text on hover
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 8px rgba(255, 138, 101, 0.3)',
              },
              '&:disabled': {
                color: 'rgba(255, 87, 34, 0.5)', // Visible disabled state
                borderColor: 'rgba(255, 138, 101, 0.3)',
              }
            }}
          >
            No Ball
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => {
              setExtraType('bye');
              setExtraRuns(1);
              setIsExtraRunsDialogOpen(true);
            }}
            disabled={!isAdmin || isOverCompleted || !isOverInProgress || isWaitingForNewBatsman || !striker || !nonStriker || !bowler || isMatchCompleted}
            sx={{
              minHeight: isMobile ? '45px' : '50px',
              borderRadius: '10px',
              fontWeight: 'bold',
              color: '#4CAF50', // Changed to more visible green color
              borderColor: '#81C784',
              background: 'rgba(129, 199, 132, 0.1)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(45deg, #81C784 30%, #66BB6A 90%)',
                borderColor: '#66BB6A',
                color: '#fff', // White text on hover
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 8px rgba(129, 199, 132, 0.3)',
              },
              '&:disabled': {
                color: 'rgba(76, 175, 80, 0.5)', // Visible disabled state
                borderColor: 'rgba(129, 199, 132, 0.3)',
              }
            }}
          >
            Bye
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => {
              setExtraType('legBye');
              setExtraRuns(1);
              setIsExtraRunsDialogOpen(true);
            }}
            disabled={!isAdmin || isOverCompleted || !isOverInProgress || isWaitingForNewBatsman || !striker || !nonStriker || !bowler || isMatchCompleted}
            sx={{
              minHeight: isMobile ? '45px' : '50px',
              borderRadius: '10px',
              fontWeight: 'bold',
              color: '#9C27B0', // Changed to more visible purple color
              borderColor: '#9575CD',
              background: 'rgba(149, 117, 205, 0.1)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(45deg, #9575CD 30%, #7E57C2 90%)',
                borderColor: '#7E57C2',
                color: '#fff', // White text on hover
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 8px rgba(149, 117, 205, 0.3)',
              },
              '&:disabled': {
                color: 'rgba(156, 39, 176, 0.5)', // Visible disabled state
                borderColor: 'rgba(149, 117, 205, 0.3)',
              }
            }}
          >
            Leg Bye
          </Button>
        </Box>
      </Box>      {/* Batting Scorecard */}
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h6" 
          gutterBottom
          sx={{ 
            color: '#2c3e50',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
            mb: 2
          }}
        >
          🏏 {isMobile ? 'Batting' : 'Batting Scorecard'}
        </Typography>
        <TableContainer 
          component={Paper} 
          sx={{ 
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0',
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ 
                background: '#2196F3',
                '& .MuiTableCell-head': {
                  color: '#fff',
                  fontWeight: 'bold'
                }
              }}>
                <TableCell>{isMobile ? 'Player' : 'Batter'}</TableCell>
                <TableCell align="right">{isMobile ? 'R' : 'Runs'}</TableCell>
                <TableCell align="right">{isMobile ? 'B' : 'Balls'}</TableCell>
                <TableCell align="right">4s</TableCell>
                <TableCell align="right">6s</TableCell>
                <TableCell align="right">{isMobile ? 'SR' : 'S/R'}</TableCell>
                <TableCell align="center">{isMobile ? 'Sts' : 'Status'}</TableCell>
              </TableRow>
            </TableHead>
          <TableBody>
            {currentInning.battingStats && Array.isArray(currentInning.battingStats) 
              ? currentInning.battingStats.map((stat) => {
              const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id || '';
              const playerName = typeof stat.player === 'string' 
                ? players.find(p => p._id === stat.player)?.name 
                : stat.player?.name;
              const strikeRate =
                stat.balls > 0
                  ? ((stat.runs / stat.balls) * 100).toFixed(2)
                  : '0.00';

              let statusDisplay = '';
              let statusColor = 'inherit';
              
              if (stat.isOut) {
                statusDisplay = `${stat.dismissalType || 'Out'}${stat.howOut ? ` (${stat.howOut})` : ''}`;
                statusColor = 'error.main';
              } else if (playerId === striker) {
                statusDisplay = 'Batting*';
                statusColor = 'success.main';
              } else if (playerId === nonStriker) {
                statusDisplay = 'Batting';
                statusColor = 'primary.main';
              } else {
                statusDisplay = 'Not Out';
                statusColor = 'text.secondary';
              }

              return (
                <TableRow 
                  key={playerId} 
                  sx={{ 
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    },
                    borderLeft: stat.isOut ? '4px solid #f44336' : 
                               (playerId === striker ? '4px solid #4caf50' : 
                               (playerId === nonStriker ? '4px solid #2196f3' : '4px solid transparent'))
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {playerName}
                      {playerId === striker && !stat.isOut && <Box component="span" sx={{ color: 'success.main', fontWeight: 'bold' }}>*</Box>}
                      {playerId === nonStriker && !stat.isOut && <Box component="span" sx={{ color: 'primary.main' }}>†</Box>}
                      {stat.isOut && <Box component="span" sx={{ color: 'error.main', fontWeight: 'bold', fontSize: '0.75rem' }}>(OUT)</Box>}
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: playerId === striker && !stat.isOut ? 'bold' : 'normal' }}>{stat.runs}</TableCell>
                  <TableCell align="right">{stat.balls}</TableCell>
                  <TableCell align="right">{stat.fours}</TableCell>
                  <TableCell align="right">{stat.sixes}</TableCell>
                  <TableCell align="right">{strikeRate}</TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ color: statusColor, fontSize: '0.75rem' }}>
                      {statusDisplay}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })
            : []}
          </TableBody>
        </Table>
      </TableContainer>
      </Box>

      {/* Bowling Scorecard */}
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h6" 
          gutterBottom
          sx={{ 
            color: '#2c3e50',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
            mb: 2
          }}
        >
          🎯 {isMobile ? 'Bowling' : 'Bowling Scorecard'}
        </Typography>
        <TableContainer 
          component={Paper}
          sx={{ 
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0',
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ 
                background: '#FF5722',
                '& .MuiTableCell-head': {
                  color: '#fff',
                  fontWeight: 'bold'
                }
              }}>
                <TableCell>{isMobile ? 'Player' : 'Bowler'}</TableCell>
                <TableCell align="right">{isMobile ? 'O' : 'Overs'}</TableCell>
                <TableCell align="right">{isMobile ? 'B' : 'Balls'}</TableCell>
                <TableCell align="right">{isMobile ? 'R' : 'Runs'}</TableCell>
                <TableCell align="right">{isMobile ? 'W' : 'Wickets'}</TableCell>
                <TableCell align="right">{isMobile ? 'Eco' : 'Economy'}</TableCell>
                <TableCell align="center">{isMobile ? 'Sts' : 'Status'}</TableCell>
              </TableRow>
            </TableHead>
          <TableBody>
            {currentInning.bowlingStats.map((stat) => {
              const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id || '';
              const playerName = typeof stat.player === 'string'
                ? players.find(p => p._id === stat.player)?.name
                : stat.player?.name;
              
              const totalBalls = stat.balls || 0;
              const completeOvers = Math.floor(totalBalls / 6);
              const remainingBalls = totalBalls % 6;
              const oversDisplay = remainingBalls > 0 ? `${completeOvers}.${remainingBalls}` : completeOvers.toString();
              
              const economy = totalBalls > 0 ? ((stat.runs / totalBalls) * 6).toFixed(2) : '0.00';
              
              let statusDisplay = '';
              let statusColor = 'inherit';
              
              if (playerId === bowler) {
                statusDisplay = 'Bowling*';
                statusColor = 'success.main';
              } else if (stat.lastBowledOver !== undefined) {
                statusDisplay = `Last: Over ${stat.lastBowledOver + 1}`;
                statusColor = 'text.secondary';
              } else {
                statusDisplay = 'Available';
                statusColor = 'primary.main';
              }

              return (
                <TableRow key={playerId} sx={{ backgroundColor: playerId === bowler ? 'action.selected' : 'inherit' }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {playerName}
                      {playerId === bowler && <Box component="span" sx={{ color: 'success.main', fontWeight: 'bold' }}>*</Box>}
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: playerId === bowler ? 'bold' : 'normal' }}>{oversDisplay}</TableCell>
                  <TableCell align="right">{totalBalls}</TableCell>
                  <TableCell align="right">{stat.runs}</TableCell>
                  <TableCell align="right">{stat.wickets}</TableCell>
                  <TableCell align="right">{economy}</TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ color: statusColor, fontSize: '0.75rem' }}>
                      {statusDisplay}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      </Box>

      {/* Extras Summary */}
      {match && match.innings && match.innings.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{ 
              color: '#2c3e50',
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
              mb: 2
            }}
          >
            ⚡ {isMobile ? 'Extras' : 'Extras Summary'}
          </Typography>
          <Paper sx={{ 
            p: 3,
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0',
          }}>
            <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap' }}>
              <Box sx={{ minWidth: '100px' }}>
                <Typography variant="h4" sx={{ color: '#FF9800', fontWeight: 'bold' }}>
                  {match.innings[currentInnings]?.extras?.wides || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {isMobile ? 'W' : 'Wides'}
                </Typography>
              </Box>
              <Box sx={{ minWidth: '100px' }}>
                <Typography variant="h4" sx={{ color: '#FF5722', fontWeight: 'bold' }}>
                  {match.innings[currentInnings]?.extras?.noBalls || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {isMobile ? 'NB' : 'No Balls'}
                </Typography>
              </Box>
              <Box sx={{ minWidth: '100px' }}>
                <Typography variant="h4" sx={{ color: '#4CAF50', fontWeight: 'bold' }}>
                  {match.innings[currentInnings]?.extras?.byes || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {isMobile ? 'B' : 'Byes'}
                </Typography>
              </Box>
              <Box sx={{ minWidth: '100px' }}>
                <Typography variant="h4" sx={{ color: '#9C27B0', fontWeight: 'bold' }}>
                  {match.innings[currentInnings]?.extras?.legByes || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {isMobile ? 'LB' : 'Leg Byes'}
                </Typography>
              </Box>
              <Box sx={{ minWidth: '100px', 
                p: 2, 
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                borderRadius: '8px',
                color: '#fff'
              }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {match.innings[currentInnings]?.extras?.total || 0}
                </Typography>
                <Typography variant="body2">
                  {isMobile ? 'Total' : 'Total Extras'}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Box>
      )}

      {/* Wicket Dialog */}
      <Dialog 
        open={isWicketDialogOpen} 
        onClose={() => setIsWicketDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(45deg, #FF6B6B 30%, #FF5722 90%)',
          color: '#fff',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
          borderRadius: '16px 16px 0 0'
        }}>
          🏏 Record Wicket
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {!wicketDetails ? (
            <Stack spacing={2} component="div">
              <Typography variant="body2" sx={{ mb: 2, color: 'text.primary', fontWeight: 500 }}>
                Select dismissal type:
              </Typography>
              <Button 
                variant="outlined" 
                onClick={() => setWicketDetails({ type: 'bowled' })}
                fullWidth
                sx={{
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, rgba(76, 175, 80, 0.1) 30%, rgba(139, 195, 74, 0.1) 90%)',
                  borderColor: '#4CAF50',
                  color: '#4CAF50',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
                    color: '#fff',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 8px rgba(76, 175, 80, 0.3)',
                  }
                }}
              >
                🎯 Bowled
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => setWicketDetails({ type: 'caught' })}
                fullWidth
                sx={{
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, rgba(33, 150, 243, 0.1) 30%, rgba(33, 203, 243, 0.1) 90%)',
                  borderColor: '#2196F3',
                  color: '#2196F3',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    color: '#fff',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 8px rgba(33, 150, 243, 0.3)',
                  }
                }}
              >
                🤲 Caught
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => setWicketDetails({ type: 'lbw' })}
                fullWidth
                sx={{
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, rgba(255, 152, 0, 0.1) 30%, rgba(255, 183, 77, 0.1) 90%)',
                  borderColor: '#FF9800',
                  color: '#FF9800',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #FF9800 30%, #FFB74D 90%)',
                    color: '#fff',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 8px rgba(255, 152, 0, 0.3)',
                  }
                }}
              >
                🦵 LBW
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => setWicketDetails({ type: 'runout' })}
                fullWidth
                sx={{
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, rgba(244, 67, 54, 0.1) 30%, rgba(211, 47, 47, 0.1) 90%)',
                  borderColor: '#f44336',
                  color: '#f44336',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #f44336 30%, #d32f2f 90%)',
                    color: '#fff',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 8px rgba(244, 67, 54, 0.3)',
                  }
                }}
              >
                🏃 Run Out
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => setWicketDetails({ type: 'stumped' })}
                fullWidth
                sx={{
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, rgba(156, 39, 176, 0.1) 30%, rgba(142, 36, 170, 0.1) 90%)',
                  borderColor: '#9C27B0',
                  color: '#9C27B0',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #9C27B0 30%, #8E24AA 90%)',
                    color: '#fff',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 8px rgba(156, 39, 176, 0.3)',
                  }
                }}
              >
                🧤 Stumped
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => setWicketDetails({ type: 'hitWicket' })}
                fullWidth
                sx={{
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, rgba(121, 85, 72, 0.1) 30%, rgba(141, 110, 99, 0.1) 90%)',
                  borderColor: '#795548',
                  color: '#795548',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #795548 30%, #8D6E63 90%)',
                    color: '#fff',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 8px rgba(121, 85, 72, 0.3)',
                  }
                }}
              >
                💥 Hit Wicket
              </Button>
            </Stack>
          ) : (
            <Stack spacing={3} component="div">
              <Typography 
                variant="h6"
                sx={{
                  background: 'linear-gradient(45deg, #FF6B6B 30%, #FF5722 90%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}
              >
                Dismissal: {wicketDetails.type.charAt(0).toUpperCase() + wicketDetails.type.slice(1)}
              </Typography>
              
              {wicketDetails.type === 'caught' && (
                <FormControl 
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#2196F3',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#2196F3',
                        borderWidth: '2px',
                      }
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#2196F3',
                    }
                  }}
                >
                  <InputLabel>Caught by</InputLabel>
                  <Select
                    value={wicketDetails.caughtBy || ''}
                    onChange={(e) => setWicketDetails({
                      ...wicketDetails,
                      caughtBy: e.target.value
                    })}
                  >
                    {players
                      .filter(player => {
                        if (!player.teams || !Array.isArray(player.teams) || !bowlingTeamId) return false;
                        return player.teams.some(team => {
                          const teamId = typeof team === 'string' ? team : team._id;
                          return teamId === String(bowlingTeamId);
                        });
                      })
                      .map((player) => (
                        <MenuItem key={player._id} value={player._id}>
                          {player.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              )}
              
              {wicketDetails.type === 'runout' && (
                <FormControl 
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#f44336',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#f44336',
                        borderWidth: '2px',
                      }
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#f44336',
                    }
                  }}
                >
                  <InputLabel>Run out by</InputLabel>
                  <Select
                    value={wicketDetails.runOutBy || ''}
                    onChange={(e) => setWicketDetails({
                      ...wicketDetails,
                      runOutBy: e.target.value
                    })}
                  >
                    {players
                      .filter(player => {
                        if (!player.teams || !Array.isArray(player.teams) || !bowlingTeamId) return false;
                        return player.teams.some(team => {
                          const teamId = typeof team === 'string' ? team : team._id;
                          return teamId === String(bowlingTeamId);
                        });
                      })
                      .map((player) => (
                        <MenuItem key={player._id} value={player._id}>
                          {player.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              )}
              
              {wicketDetails.type === 'stumped' && (
                <FormControl 
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#9C27B0',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#9C27B0',
                        borderWidth: '2px',
                      }
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#9C27B0',
                    }
                  }}
                >
                  <InputLabel>Stumped by (Wicket Keeper)</InputLabel>
                  <Select
                    value={wicketDetails.stumpedBy || ''}
                    onChange={(e) => setWicketDetails({
                      ...wicketDetails,
                      stumpedBy: e.target.value
                    })}
                  >
                    {players
                      .filter(player => {
                        if (!player.teams || !Array.isArray(player.teams) || !bowlingTeamId) return false;
                        return player.teams.some(team => {
                          const teamId = typeof team === 'string' ? team : team._id;
                          return teamId === String(bowlingTeamId);
                        });
                      })
                      .map((player) => (
                        <MenuItem key={player._id} value={player._id}>
                          {player.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              )}
              
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => {
                  let dismissalDetails = wicketDetails.type;
                  let dismissedBy = '';
                  
                  if (wicketDetails.type === 'caught' && wicketDetails.caughtBy) {
                    const catcherName = players.find(p => p._id === wicketDetails.caughtBy)?.name || '';
                    dismissalDetails = `caught by ${catcherName}`;
                    dismissedBy = wicketDetails.caughtBy;
                  } else if (wicketDetails.type === 'runout' && wicketDetails.runOutBy) {
                    const runOutByName = players.find(p => p._id === wicketDetails.runOutBy)?.name || '';
                    dismissalDetails = `run out by ${runOutByName}`;
                    dismissedBy = wicketDetails.runOutBy;
                  } else if (wicketDetails.type === 'stumped' && wicketDetails.stumpedBy) {
                    const stumpedByName = players.find(p => p._id === wicketDetails.stumpedBy)?.name || '';
                    dismissalDetails = `stumped by ${stumpedByName}`;
                    dismissedBy = wicketDetails.stumpedBy;
                  } else if (wicketDetails.type === 'lbw') {
                    dismissalDetails = 'LBW';
                    dismissedBy = bowler; // LBW credited to bowler
                  } else if (wicketDetails.type === 'hitWicket') {
                    dismissalDetails = 'Hit Wicket';
                    dismissedBy = bowler; // Hit wicket credited to bowler
                  } else if (wicketDetails.type === 'bowled') {
                    dismissalDetails = 'Bowled';
                    dismissedBy = bowler; // Bowled credited to bowler
                  }
                  
                  handleWicket(wicketDetails.type, dismissalDetails, dismissedBy);
                }}
                disabled={
                  (wicketDetails.type === 'caught' && !wicketDetails.caughtBy) ||
                  (wicketDetails.type === 'runout' && !wicketDetails.runOutBy) ||
                  (wicketDetails.type === 'stumped' && !wicketDetails.stumpedBy)
                }
                fullWidth
              >
                Record Wicket
              </Button>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setIsWicketDialogOpen(false);
            setWicketDetails(null);
          }}>
            Cancel
          </Button>
          {wicketDetails && (
            <Button onClick={() => setWicketDetails(null)}>
              Back
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Extra Runs Dialog for All Extras */}
      <Dialog 
        open={isExtraRunsDialogOpen} 
        onClose={() => setIsExtraRunsDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          }
        }}
      >
        <DialogTitle sx={{ 
          background: extraType === 'wide' 
            ? 'linear-gradient(45deg, #FFB74D 30%, #FFA726 90%)'
            : extraType === 'noBall'
            ? 'linear-gradient(45deg, #FF8A65 30%, #FF7043 90%)'
            : extraType === 'bye'
            ? 'linear-gradient(45deg, #81C784 30%, #66BB6A 90%)'
            : 'linear-gradient(45deg, #9575CD 30%, #7E57C2 90%)',
          color: '#fff',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
          borderRadius: '16px 16px 0 0'
        }}>
          {extraType === 'wide' ? '⚡ Wide + Runs' :
           extraType === 'noBall' ? '🚫 No Ball + Runs' :
           extraType === 'bye' ? '🏃 Bye Runs' : '🦵 Leg Bye Runs'}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary' }}>
              {extraType === 'wide' ? 'How many additional runs were taken on the wide ball?' :
               extraType === 'noBall' ? 'How many additional runs were taken on the no ball?' :
               `How many runs were taken for the ${extraType === 'bye' ? 'bye' : 'leg bye'}?`}
            </Typography>
            <TextField
              label="Additional Runs"
              type="number"
              value={extraRuns}
              onChange={(e) => setExtraRuns(Math.max(0, parseInt(e.target.value) || 0))}
              inputProps={{ min: 0, max: 6 }}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: extraType === 'wide' ? '#FFB74D' : 
                               extraType === 'noBall' ? '#FF8A65' :
                               extraType === 'bye' ? '#81C784' : '#9575CD',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: extraType === 'wide' ? '#FFB74D' : 
                               extraType === 'noBall' ? '#FF8A65' :
                               extraType === 'bye' ? '#81C784' : '#9575CD',
                    borderWidth: '2px',
                  }
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: extraType === 'wide' ? '#FFB74D' : 
                        extraType === 'noBall' ? '#FF8A65' :
                        extraType === 'bye' ? '#81C784' : '#9575CD',
                }
              }}
            />
            <Typography variant="body2" color="textSecondary" sx={{ 
              p: 2, 
              background: '#f5f5f5', 
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              {extraType === 'wide' || extraType === 'noBall' ? 
                `Total runs: ${extraType === 'wide' ? 1 : 1} (${extraType}) + ${extraRuns} (additional) = ${(extraType === 'wide' ? 1 : 1) + extraRuns}` :
                `${extraRuns} run${extraRuns !== 1 ? 's' : ''} will be added to team total`}
              <br />
              {(extraType === 'bye' || extraType === 'legBye') && extraRuns % 2 === 1 ? 
                '🔄 Striker and non-striker will swap ends' : 
                (extraType === 'bye' || extraType === 'legBye') ?
                '↔️ Batsmen will remain at their current ends' : ''}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setIsExtraRunsDialogOpen(false)}
            sx={{
              borderRadius: '8px',
              fontWeight: 'bold'
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              if (extraType) {
                // For wide and no ball, total runs = base extra (1) + additional runs
                const totalRuns = (extraType === 'wide' || extraType === 'noBall') ? 1 + extraRuns : extraRuns;
                handleExtra(extraType, totalRuns);
                setIsExtraRunsDialogOpen(false);
                setExtraType(null);
                setExtraRuns(1);
              }
            }}
            disabled={!extraType}
            sx={{
              borderRadius: '8px',
              fontWeight: 'bold',
              background: extraType === 'wide' 
                ? 'linear-gradient(45deg, #FFB74D 30%, #FFA726 90%)'
                : extraType === 'noBall'
                ? 'linear-gradient(45deg, #FF8A65 30%, #FF7043 90%)'
                : extraType === 'bye'
                ? 'linear-gradient(45deg, #81C784 30%, #66BB6A 90%)'
                : 'linear-gradient(45deg, #9575CD 30%, #7E57C2 90%)',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              }
            }}
          >
            Record {extraType === 'wide' ? 'Wide' : 
                   extraType === 'noBall' ? 'No Ball' :
                   extraType === 'bye' ? 'Bye' : 'Leg Bye'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mid-Over Bowler Change Dialog */}
      <Dialog open={isBowlerChangeDialogOpen} onClose={handleCancelBowlerChange}>
        <DialogTitle>⚠️ Mid-Over Bowler Change</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Changing bowler mid-over should only be done in emergency situations. 
            Please select the reason for this change:
          </Typography>
          <Stack spacing={2}>
            <Button 
              variant="outlined" 
              color="error"
              onClick={() => handleAllowBowlerChange('Injury')}
              startIcon={<span>🤕</span>}
            >
              Bowler Injury
            </Button>
            <Button 
              variant="outlined" 
              color="warning"
              onClick={() => handleAllowBowlerChange('Illness')}
              startIcon={<span>🤒</span>}
            >
              Bowler Illness
            </Button>
            <Button 
              variant="outlined" 
              color="info"
              onClick={() => handleAllowBowlerChange('Equipment Issue')}
              startIcon={<span>🏏</span>}
            >
              Equipment Issue
            </Button>
            <Button 
              variant="outlined" 
              color="secondary"
              onClick={() => handleAllowBowlerChange('Other Emergency')}
              startIcon={<span>⚠️</span>}
            >
              Other Emergency
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelBowlerChange}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Player Selection Dialog */}
      <Dialog 
        open={isPlayerSelectionDialogOpen} 
        onClose={() => setIsPlayerSelectionDialogOpen(false)}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          }
        }}
      >
        <DialogTitle sx={{ 
          background: getDialogContext().gradientColor,
          color: '#fff',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
          borderRadius: '16px 16px 0 0'
        }}>
          {getDialogContext().title}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.primary', fontWeight: 500 }}>
            {getDialogContext().message}
          </Typography>
          
          {/* Warning for insufficient batsmen */}
          {(() => {
            const availableBatsmen = getAvailableBatsmen();
            if (availableBatsmen.length < 2) {
              return (
                <Alert 
                  severity="warning" 
                  sx={{ mb: 3, borderRadius: 2 }}
                >
                  <AlertTitle sx={{ fontWeight: 'bold' }}>⚠️ Insufficient Batsmen</AlertTitle>
                  Only {availableBatsmen.length} available batsmen found. Need at least 2 to continue the match.
                  {availableBatsmen.length === 0 && ' This innings will be skipped.'}
                  {availableBatsmen.length === 1 && ' The match may end after the next wicket.'}
                </Alert>
              );
            }
            return null;
          })()}
          
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3 }}>
            {/* Striker Selection - Show unless it's only bowler selection */}
            {!getDialogContext().showOnlyBowler && (
            <Autocomplete
              fullWidth
              options={players
                .filter(player => {
                  if (!player.teams || !Array.isArray(player.teams) || !match?.innings?.[currentInnings]?.battingTeam) return false;
                  
                  const battingTeam = match.innings[currentInnings].battingTeam;
                  const battingTeamId = typeof battingTeam === 'object' 
                    ? (battingTeam as any)._id 
                    : battingTeam;
                  
                  const hasTeam = player.teams.some(team => {
                    const teamId = typeof team === 'string' ? team : team._id;
                    return teamId === String(battingTeamId);
                  });
                  
                  // Check if player is out
                  const currentInning = match.innings[currentInnings];
                  const isPlayerOut = currentInning?.battingStats?.some(stat => {
                    const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id;
                    return playerId === player._id && stat.isOut;
                  });
                  
                  // Don't allow same player as non-striker
                  const isSameAsNonStriker = player._id === nonStriker;
                  
                  return hasTeam && !isPlayerOut && !isSameAsNonStriker;
                })}
              getOptionLabel={(option) => option.name}
              value={players.find(p => p._id === striker) || null}
              onChange={(event, newValue) => {
                if (newValue && newValue._id) {
                  setStriker(newValue._id);
                }
              }}
              renderInput={(params) => (
                <TextField {...params} label="Striker" />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Typography>{option.name}</Typography>
                </Box>
              )}
            />
            )}

            {/* Non-Striker Selection - Show unless it's only bowler or only striker selection */}
            {!getDialogContext().showOnlyBowler && !getDialogContext().showOnlyStriker && (
            <Autocomplete
              fullWidth
              options={players
                .filter(player => {
                  if (!player.teams || !Array.isArray(player.teams) || !match?.innings?.[currentInnings]?.battingTeam) return false;
                  
                  const battingTeam = match.innings[currentInnings].battingTeam;
                  const battingTeamId = typeof battingTeam === 'object' 
                    ? (battingTeam as any)._id 
                    : battingTeam;
                  
                  const hasTeam = player.teams.some(team => {
                    const teamId = typeof team === 'string' ? team : team._id;
                    return teamId === String(battingTeamId);
                  });
                  
                  // Check if player is out
                  const currentInning = match.innings[currentInnings];
                  const isPlayerOut = currentInning?.battingStats?.some(stat => {
                    const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id;
                    return playerId === player._id && stat.isOut;
                  });
                  
                  // Don't allow same player as striker
                  const isSameAsStriker = player._id === striker;
                  
                  return hasTeam && !isPlayerOut && !isSameAsStriker;
                })}
              getOptionLabel={(option) => option.name}
              value={players.find(p => p._id === nonStriker) || null}
              onChange={(event, newValue) => {
                if (newValue && newValue._id) {
                  setNonStriker(newValue._id);
                }
              }}
              renderInput={(params) => (
                <TextField {...params} label="Non-Striker" />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Typography>{option.name}</Typography>
                </Box>
              )}
            />
            )}

            {/* Bowler Selection - Show unless it's only striker selection */}
            {!getDialogContext().showOnlyStriker && (
            <Autocomplete
              fullWidth
              options={players
                .filter(player => {
                  if (!player.teams || !Array.isArray(player.teams) || !match?.innings?.[currentInnings]?.bowlingTeam) return false;
                  
                  const bowlingTeam = match.innings[currentInnings].bowlingTeam;
                  const bowlingTeamId = typeof bowlingTeam === 'object' 
                    ? (bowlingTeam as any)._id 
                    : bowlingTeam;
                  
                  const hasTeam = player.teams.some(team => {
                    const teamId = typeof team === 'string' ? team : team._id;
                    return teamId === String(bowlingTeamId);
                  });
                  
                  return hasTeam;
                })}
              getOptionLabel={(option) => option.name}
              value={players.find(p => p._id === bowler) || null}
              onChange={(event, newValue) => {
                if (newValue && newValue._id) {
                  setBowler(newValue._id);
                }
              }}
              renderInput={(params) => (
                <TextField {...params} label="Bowler" />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Typography>{option.name}</Typography>
                </Box>
              )}
            />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setIsPlayerSelectionDialogOpen(false)}
            sx={{ mr: 2 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              if (areRequiredSelectionsComplete()) {
                setIsPlayerSelectionDialogOpen(false);
                
                // Handle different contexts
                if (isOverCompleted) {
                  // Over completion - reset the over completion state and clear current over
                  setIsOverCompleted(false);
                  setOverCompletionMessage('');
                  setIsOverInProgress(true);
                  
                  // CRITICAL FIX: Clear current over balls for fresh start
                  setCurrentOverBalls([]);
                  
                  // Also clear the match data current over balls
                  if (match && match.innings && match.innings[currentInnings]) {
                    match.innings[currentInnings].currentOverBalls = [];
                  }
                } else if (isWaitingForNewBatsman) {
                  // Wicket - reset the waiting state and continue
                  setIsWaitingForNewBatsman(false);
                } else {
                  // Match start/continue - start the match
                  setIsOverInProgress(true);
                  setIsOverCompleted(false);
                  setOverCompletionMessage('');
                }
              }
            }}
            disabled={!areRequiredSelectionsComplete()}
            sx={{
              background: areRequiredSelectionsComplete() 
                ? 'linear-gradient(45deg, #4CAF50 30%, #66BB6A 90%)' 
                : undefined,
              '&:hover': areRequiredSelectionsComplete() ? {
                background: 'linear-gradient(45deg, #388E3C 30%, #4CAF50 90%)',
              } : undefined
            }}
          >
            {isOverCompleted ? '🎯 Continue with New Bowler' : 
             isWaitingForNewBatsman ? '🏏 Continue with New Batsman' : 
             '🚀 Start Match'}
          </Button>
        </DialogActions>
      </Dialog>
      </Paper>
    </Box>
    </Container>
  );
};

export default LiveScoring;