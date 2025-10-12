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
} from '@mui/material';

interface Props {}

const LiveScoring: React.FC<Props> = () => {
  const { matchId } = useParams();
  
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
          // Note: When resuming a match, we can't reconstruct the exact ball-by-ball
          // history for the current over, but new balls will be tracked going forward
          setCurrentOverBalls([]);
        } else if (totalBalls > 0 && currentBall === 0) {
          // If total balls is multiple of 6, over might be completed
          setIsOverCompleted(false);
          setIsOverInProgress(false);
          setCurrentOverBalls([]);
        }
        
        // Always initialize striker from match data
        if (currentInning.battingStats.length > 0) {
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
        if (currentInning.battingStats.length > 1) {
          // Find the non-striker (not on strike and not out)
          const nonStrikeBatter = currentInning.battingStats.find(stat => !stat.isOnStrike && !stat.isOut);
          if (nonStrikeBatter) {
            const nonStrikerId = typeof nonStrikeBatter.player === 'string'
              ? nonStrikeBatter.player
              : nonStrikeBatter.player._id || '';
            setNonStriker(nonStrikerId);
          } else if (currentInning.battingStats.length > 1) {
            // Fallback to second batsman if available
            const secondBatter = currentInning.battingStats[1];
            if (!secondBatter.isOut) {
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

  // Reset all local states when innings changes
  useEffect(() => {
    if (currentInnings === 1) {
      // Reset all stats displays for second innings
      setStrikerStats({ runs: 0, balls: 0 });
      setNonStrikerStats({ runs: 0, balls: 0 });
      setBowlerStats({ overs: 0, runs: 0, wickets: 0, balls: 0 });
      setCurrentOverBalls([]);
      // Force a re-fetch of match data to ensure UI is refreshed
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
        ballNumber: remainingInningsBalls === 0 ? 6 : remainingInningsBalls,
        runs,
        isWicket: false,
        extras: isExtra ? { type: 'wide', runs } : undefined
      };
      
      setCurrentOverBalls(prev => [...prev, ballOutcome]);

      // Check if over is complete (6 valid balls)
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
            
            console.log('Innings transition - updatedMatch.currentInnings:', updatedMatch.currentInnings);
            console.log('Innings transition - updatedMatch.innings.length:', updatedMatch.innings.length);
            
            // Update states immediately for UI responsiveness
            setMatch(updatedMatch);
            setCurrentInnings(1);
            
            console.log('Innings transition - States updated, saving to server...');
            
            // Save the innings transition to server immediately
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
              console.log('Innings transition - Sending to server:', cleanedMatch.currentInnings);
              const { data } = await matchService.updateScore(matchId, cleanedMatch);
              console.log('Innings transition - Server response currentInnings:', data.currentInnings);
              
              // Update with server response to ensure consistency
              setMatch(data); 
              if (data.currentInnings !== undefined) {
                setCurrentInnings(data.currentInnings);
              }
            } catch (error) {
              console.error('Error saving innings transition:', error);
              // If server update fails, at least keep UI in sync
            }
            
            // Reset all UI states for new innings
            setStriker('');
            setNonStriker('');
            setBowler('');
            setCurrentOverBalls([]); // Reset ball commentary
            setIsOverInProgress(false); // Reset over state
            setIsOverCompleted(true);
            setStrikerStats({ runs: 0, balls: 0 }); // Reset batting stats display
            setNonStrikerStats({ runs: 0, balls: 0 });
            setBowlerStats({ overs: 0, runs: 0, wickets: 0, balls: 0 }); // Reset bowling stats display
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
        currentInning.battingStats.forEach(stat => {
          if (typeof stat.player === 'string') {
            stat.isOnStrike = stat.player === nonStriker;
          } else {
            stat.isOnStrike = stat.player._id === nonStriker;
          }
        });
        
        // Update local stats to reflect the new striker (who was non-striker before)
        // The runs were already added to the original striker's stats above
        // Now we need to sync the local state with the actual batting stats
        const newStrikerStats = currentInning.battingStats.find(
          (stat) => typeof stat.player === 'string' ? stat.player === nonStriker : stat.player._id === nonStriker
        );
        const newNonStrikerStats = currentInning.battingStats.find(
          (stat) => typeof stat.player === 'string' ? stat.player === temp : stat.player._id === temp
        );
        
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
        currentInning.battingStats.forEach(stat => {
          if (typeof stat.player === 'string') {
            stat.isOnStrike = stat.player === striker;
          } else {
            stat.isOnStrike = stat.player._id === striker;
          }
        });
        
        // Update local striker stats to match the batting stats
        const currentStrikerStats = currentInning.battingStats.find(
          (stat) => typeof stat.player === 'string' ? stat.player === striker : stat.player._id === striker
        );
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
      ballNumber: type === 'wide' || type === 'noBall' ? 0 : (currentInning.currentState?.currentBall || 0), // Extras don't count as ball numbers
      runs,
      isWicket: false,
      extras: {
        type: type as 'wide' | 'no-ball' | 'bye' | 'leg-bye',
        runs
      }
    };
    
    setCurrentOverBalls(prev => [...prev, extraBall]);
    
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
      currentInning.battingStats.forEach(stat => {
        if (typeof stat.player === 'string') {
          stat.isOnStrike = stat.player === nonStriker;
        } else {
          stat.isOnStrike = stat.player._id === nonStriker;
        }
      });
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
    const strikerBattingStats = currentInning.battingStats.find(
      (stat) => (typeof stat.player === 'string' ? stat.player : stat.player._id) === striker
    );
    
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
      ballNumber: remainingInningsBalls === 0 ? 6 : remainingInningsBalls,
      runs: 0,
      isWicket: true,
      dismissalType: type as any,
      fielder: dismissedBy
    };
    
    setCurrentOverBalls(prev => [...prev, wicketBall]);

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
        }
        
        // Sync with actual match data if the player already has stats
        const newStrikerStats = currentInning.battingStats.find(
          (stat) => typeof stat.player === 'string' ? stat.player === newStriker : stat.player._id === newStriker
        );
        
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
    setBowler(event.target.value);
    // Clear over completion state when new bowler is selected
    if (isOverCompleted) {
      setIsOverCompleted(false);
      setOverCompletionMessage('');
    }
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
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        p: 3
      }}
    >
      <Paper 
        elevation={8}
        sx={{ 
          p: 4, 
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
          🏏 {`${typeof match.team1 === 'object' ? match.team1.name : match.team1} vs ${typeof match.team2 === 'object' ? match.team2.name : match.team2}`}
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
              Teams have been swapped. {typeof currentInning?.battingTeam === 'object' ? currentInning.battingTeam.name : currentInning?.battingTeam} is now batting.
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

      {/* Score Summary */}
      <Paper sx={{ p: 2, mb: 3 }} component="div">
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
          isAdmin={isAdmin}
          isOverInProgress={isOverInProgress}
          isOverCompleted={isOverCompleted}
          overCompletionMessage={overCompletionMessage}
          onStartNewOver={() => {
            setIsOverInProgress(true);
            setIsOverCompleted(false);
            setOverCompletionMessage('');
            setCurrentOverBalls([]);
          }}
          onEndOver={() => setIsOverInProgress(false)}
        />
      </Paper>

      {/* Player Selection */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
        <FormControl 
          fullWidth
          sx={{ 
            '& .MuiOutlinedInput-root': isWaitingForNewBatsman ? {
              backgroundColor: 'warning.light',
              '&:hover': { backgroundColor: 'warning.light' }
            } : {}
          }}
        >
          <InputLabel>Striker {isWaitingForNewBatsman ? '(SELECT NEW BATSMAN!)' : ''}</InputLabel>
          <Select 
            value={striker} 
            onChange={handleBatsmanChange}
            disabled={!isAdmin || (isOverCompleted && !isWaitingForNewBatsman)}
          >
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
                
                // Check if player is out
                const isPlayerOut = currentInning.battingStats.some(stat => {
                  const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id;
                  return playerId === player._id && stat.isOut;
                });
                
                // Don't allow same player as non-striker
                const isSameAsNonStriker = player._id === nonStriker;
                
                return hasTeam && !isPlayerOut && !isSameAsNonStriker;
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
          <Select 
            value={nonStriker} 
            onChange={handleNonStrikerChange}
            disabled={!isAdmin || isOverCompleted || isWaitingForNewBatsman}
          >
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
                
                // Check if player is out
                const isPlayerOut = currentInning.battingStats.some(stat => {
                  const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id;
                  return playerId === player._id && stat.isOut;
                });
                
                // Don't allow same player as striker
                const isSameAsStriker = player._id === striker;
                
                return hasTeam && !isPlayerOut && !isSameAsStriker;
              })
              .map((player) => (
                <MenuItem key={player._id} value={player._id}>
                  {player.name}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        <FormControl 
          fullWidth
          sx={{ 
            '& .MuiOutlinedInput-root': isOverCompleted ? {
              backgroundColor: 'warning.light',
              '&:hover': { backgroundColor: 'warning.light' }
            } : {}
          }}
        >
          <InputLabel>Bowler {isOverCompleted ? '(SELECT NEW BOWLER!)' : ''}</InputLabel>
          <Select 
            value={bowler} 
            onChange={handleBowlerChange}
            disabled={!isAdmin || isWaitingForNewBatsman}
          >
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
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
          {[0, 1, 2, 3, 4, 6].map((runs) => (
            <Button 
              key={runs} 
              variant="contained" 
              onClick={() => handleBallOutcome(runs)}
              disabled={!isAdmin || isOverCompleted || !isOverInProgress || isWaitingForNewBatsman}
              sx={{
                minWidth: '60px',
                height: '60px',
                borderRadius: '12px',
                fontSize: '1.5rem',
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
            disabled={!isAdmin || isOverCompleted || !isOverInProgress || isWaitingForNewBatsman}
            sx={{
              minWidth: '60px',
              height: '60px',
              borderRadius: '12px',
              fontSize: '1.5rem',
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
        </Stack>
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
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => {
              setExtraType('wide');
              setExtraRuns(1);
              setIsExtraRunsDialogOpen(true);
            }}
            disabled={!isAdmin || isOverCompleted || !isOverInProgress || isWaitingForNewBatsman}
            sx={{
              minWidth: '100px',
              height: '50px',
              borderRadius: '10px',
              fontWeight: 'bold',
              color: '#fff',
              borderColor: '#FFB74D',
              background: 'rgba(255, 183, 77, 0.1)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(45deg, #FFB74D 30%, #FFA726 90%)',
                borderColor: '#FFA726',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 8px rgba(255, 183, 77, 0.3)',
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
            disabled={!isAdmin || isOverCompleted || !isOverInProgress || isWaitingForNewBatsman}
            sx={{
              minWidth: '100px',
              height: '50px',
              borderRadius: '10px',
              fontWeight: 'bold',
              color: '#fff',
              borderColor: '#FF8A65',
              background: 'rgba(255, 138, 101, 0.1)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(45deg, #FF8A65 30%, #FF7043 90%)',
                borderColor: '#FF7043',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 8px rgba(255, 138, 101, 0.3)',
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
            disabled={!isAdmin || isOverCompleted || !isOverInProgress || isWaitingForNewBatsman}
            sx={{
              minWidth: '100px',
              height: '50px',
              borderRadius: '10px',
              fontWeight: 'bold',
              color: '#fff',
              borderColor: '#81C784',
              background: 'rgba(129, 199, 132, 0.1)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(45deg, #81C784 30%, #66BB6A 90%)',
                borderColor: '#66BB6A',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 8px rgba(129, 199, 132, 0.3)',
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
            disabled={!isAdmin || isOverCompleted || !isOverInProgress || isWaitingForNewBatsman}
            sx={{
              minWidth: '100px',
              height: '50px',
              borderRadius: '10px',
              fontWeight: 'bold',
              color: '#fff',
              borderColor: '#9575CD',
              background: 'rgba(149, 117, 205, 0.1)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(45deg, #9575CD 30%, #7E57C2 90%)',
                borderColor: '#7E57C2',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 8px rgba(149, 117, 205, 0.3)',
              }
            }}
          >
            Leg Bye
          </Button>
        </Stack>
      </Box>

      {/* Batting Scorecard */}
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
          🏏 Batting Scorecard
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
                <TableCell>Batter</TableCell>
                <TableCell align="right">Runs</TableCell>
                <TableCell align="right">Balls</TableCell>
                <TableCell align="right">4s</TableCell>
                <TableCell align="right">6s</TableCell>
                <TableCell align="right">S/R</TableCell>
                <TableCell align="center">Status</TableCell>
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
            })}
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
          🎯 Bowling Scorecard
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
                <TableCell>Bowler</TableCell>
                <TableCell align="right">Overs</TableCell>
                <TableCell align="right">Balls</TableCell>
                <TableCell align="right">Runs</TableCell>
                <TableCell align="right">Wickets</TableCell>
                <TableCell align="right">Economy</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
          <TableBody>
            {currentInning.bowlingStats.map((stat) => {
              const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id || '';
              const playerName = typeof stat.player === 'string'
                ? players.find(p => p._id === stat.player)?.name
                : stat.player.name;
              
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
            ⚡ Extras Summary
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
                  Wides
                </Typography>
              </Box>
              <Box sx={{ minWidth: '100px' }}>
                <Typography variant="h4" sx={{ color: '#FF5722', fontWeight: 'bold' }}>
                  {match.innings[currentInnings]?.extras?.noBalls || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  No Balls
                </Typography>
              </Box>
              <Box sx={{ minWidth: '100px' }}>
                <Typography variant="h4" sx={{ color: '#4CAF50', fontWeight: 'bold' }}>
                  {match.innings[currentInnings]?.extras?.byes || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Byes
                </Typography>
              </Box>
              <Box sx={{ minWidth: '100px' }}>
                <Typography variant="h4" sx={{ color: '#9C27B0', fontWeight: 'bold' }}>
                  {match.innings[currentInnings]?.extras?.legByes || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Leg Byes
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
                  Total Extras
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
                        if (!player.teams || !bowlingTeamId) return false;
                        const teamIds = player.teams.map(team => 
                          typeof team === 'string' ? team : team._id
                        );
                        return teamIds.includes(String(bowlingTeamId));
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
                        if (!player.teams || !bowlingTeamId) return false;
                        const teamIds = player.teams.map(team => 
                          typeof team === 'string' ? team : team._id
                        );
                        return teamIds.includes(String(bowlingTeamId));
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
                        if (!player.teams || !bowlingTeamId) return false;
                        const teamIds = player.teams.map(team => 
                          typeof team === 'string' ? team : team._id
                        );
                        return teamIds.includes(String(bowlingTeamId));
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
      </Paper>
    </Box>
  );
};

export default LiveScoring;