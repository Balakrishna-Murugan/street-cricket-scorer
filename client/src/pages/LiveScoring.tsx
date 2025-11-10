import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Match, Player, BallOutcome, PlayerRef } from '../types';
import { cleanMatchData as cleanMatchDataHelper, isMaidenOver, checkMatchEnd as checkMatchEndHelper, getAvailableBatsmen as getAvailableBatsmenHelper, applyUndoSnapshot, createUndoAction } from '../utils/matchHelpers';
import { matchService, playerService } from '../services/api.service';
import PlayerSelectionDialog from '../components/PlayerSelectionDialog';
import MatchDetails from '../components/MatchDetails';
import InningsTransition from '../components/InningsTransition';
import OverControls from '../components/OverControls';
import UndoPanel from '../components/UndoPanel';
import {
  Box,
  InputLabel,
  Dialog,
  TableContainer,
  TableHead,
  Alert,
  AlertTitle,
  TextField,
  Autocomplete,
  Chip,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
  Typography,
  Paper,
  // removed LinearProgress to keep InningsTransition lightweight
  Button,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Stack,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { useToast } from '../components/ToastProvider';
import BowlerChangeDialog from '../components/BowlerChangeDialog';
// ...existing code...

// ...existing code...
import ChangeCircleIcon from '@mui/icons-material/ChangeCircle';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

interface Props {}

// Undo action types
interface UndoAction {
  id: string;
  type: 'ball_outcome' | 'wicket' | 'extra' | 'player_change';
  timestamp: number;
  data: any;
  matchState: {
    totalRuns: number;
    wickets: number;
    balls: number;
    overs: number;
    striker?: string;
    nonStriker?: string;
    bowler?: string;
    strikerStats: {
      runs: number;
      balls: number;
      fours?: number;
      sixes?: number;
      isOut?: boolean;
      dismissalType?: string;
      howOut?: string;
      dismissedBy?: string | PlayerRef;
      strikeRate?: number;
      isOnStrike?: boolean;
    };
    nonStrikerStats: {
      runs: number;
      balls: number;
      fours?: number;
      sixes?: number;
      isOut?: boolean;
      dismissalType?: string;
      howOut?: string;
      dismissedBy?: string | PlayerRef;
      strikeRate?: number;
      isOnStrike?: boolean;
    };
    bowlerStats: { overs: number; runs: number; wickets: number; balls: number };
    currentOverBalls: BallOutcome[];
    extras: { wides: number; noBalls: number; byes: number; legByes: number; total: number };
  };
}

interface DialogContext {
  title: string;
  message: string;
  showOnlyBowler: boolean;
  showOnlyStriker: boolean;
  showOnlyNonStriker: boolean;
  gradientColor: string;
}

const LiveScoring: React.FC<Props> = () => {
  const { matchId } = useParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  
  // Check user info and role for permissions
  const userRole = localStorage.getItem('userRole') || 'viewer';
  const isAdmin = userRole === 'admin';
  const isSuperAdmin = userRole === 'superadmin';
  // parse current user id from localStorage 'user' object if present
  let currentUserId: string | null = null;
  try {
    const u = localStorage.getItem('user');
    if (u) {
      const parsed = JSON.parse(u);
      currentUserId = parsed && parsed._id ? parsed._id : null;
    }
  } catch (e) {
    currentUserId = null;
  }
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  // Legacy local error mirroring removed — please use toast.showError(...) directly for transient errors.
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
  const [extraType, setExtraType] = useState<'bye' | 'leg-bye' | 'wide' | 'no-ball' | null>(null);
  const [extraRuns, setExtraRuns] = useState<number>(1);

  const [strikerStats, setStrikerStats] = useState<{
    runs: number;
    balls: number;
    fours?: number;
    sixes?: number;
    isOut?: boolean;
    dismissalType?: string;
    howOut?: string;
    dismissedBy?: string | PlayerRef;
    strikeRate?: number;
    isOnStrike?: boolean;
  }>({ runs: 0, balls: 0 });
  const [nonStrikerStats, setNonStrikerStats] = useState<{
    runs: number;
    balls: number;
    fours?: number;
    sixes?: number;
    isOut?: boolean;
    dismissalType?: string;
    howOut?: string;
    dismissedBy?: string | PlayerRef;
    strikeRate?: number;
    isOnStrike?: boolean;
  }>({ runs: 0, balls: 0 });
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
  // Track when a player-change flow is active (so we can distinguish tactical swaps
  // from wicket flows and avoid auto-opening the wicket/new-batsman context)
  const [isPlayerChangeInProgress, setIsPlayerChangeInProgress] = useState(false);
  
  // State for player change functionality
  const [isPlayerChangeDialogOpen, setIsPlayerChangeDialogOpen] = useState(false);
  const [changePlayerType, setChangePlayerType] = useState<'striker' | 'nonStriker' | 'bowler' | null>(null);
  const [changePlayerReason, setChangePlayerReason] = useState('');
  const [userDismissedDialog, setUserDismissedDialog] = useState(false); // Track if user manually cancelled
  // Track whether we already auto-opened the dialog when entering the live scoring view
  const [hasAutoOpenedOnEnter, setHasAutoOpenedOnEnter] = useState(false);
  // Track whether we've already auto-handled insufficient batsmen to avoid duplicate actions
  const [autoInsufficientHandled, setAutoInsufficientHandled] = useState(false);

  // State for alert visibility
  const [showSecondInningsAlert, setShowSecondInningsAlert] = useState(true);
  const [showViewerModeAlert, setShowViewerModeAlert] = useState(true);
  const [showOverCompletedAlert, setShowOverCompletedAlert] = useState(true);
  const [showWicketAlert, setShowWicketAlert] = useState(true);
  const [showBowlerChangeAlert, setShowBowlerChangeAlert] = useState(true);
  const [showBowlerRotationAlert, setShowBowlerRotationAlert] = useState(true);
  const [showInsufficientBatsmenAlert, setShowInsufficientBatsmenAlert] = useState(true);

  // Undo functionality state
  const [undoHistory, setUndoHistory] = useState<UndoAction[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  // Cricket stats: maiden over and hat-trick detection
  const [maidenOverInfo, setMaidenOverInfo] = useState<{ bowlerId?: string; bowlerName?: string } | null>(null);
  const [maidenCounts, setMaidenCounts] = useState<Record<string, number>>({});
  const [hatTrickInfo, setHatTrickInfo] = useState<{ bowlerId?: string; bowlerName?: string } | null>(null);
  const [consecutiveWicketsByBowler, setConsecutiveWicketsByBowler] = useState<Record<string, number>>({});

  // Helper: detect maiden overs and update state + notify (delegates pure logic to utils)
  const detectMaidenForOver = useCallback((bowlerId: string | undefined, overBalls: BallOutcome[] = []) => {
    if (!bowlerId || !overBalls || overBalls.length === 0) return;

    try {
      const isMaiden = isMaidenOver(overBalls);
      if (isMaiden) {
        const bowlerName = players.find(p => p._id === bowlerId)?.name || '';
        setMaidenCounts(prev => ({ ...prev, [bowlerId]: (prev[bowlerId] || 0) + 1 }));
        setMaidenOverInfo({ bowlerId, bowlerName });
        toast.showSuccess(`${bowlerName || 'Bowler'} bowled a maiden over!`);
      }
    } catch (e) {
      console.error('Maiden detection error', e);
    }
  }, [players, toast]);

  // Helper function to check if all required players are selected
  const arePlayersSelected = useCallback(() => {
    return striker && nonStriker && bowler && striker !== nonStriker;
  }, [striker, nonStriker, bowler]);

  // Helper function to count available batsmen for the batting team (delegates to utils)
  const getAvailableBatsmen = useCallback(() => {
    return getAvailableBatsmenHelper(match, players, currentInnings);
  }, [match, players, currentInnings]);

  // Helper function to get dialog context
  const getDialogContext = useCallback((): DialogContext => {
    // debug info removed

    if (changePlayerType) {
      // Player change context
      if (changePlayerType === 'bowler') {
        const context = {
          title: `🔄 Change Bowler (${changePlayerReason})`,
          message: 'Please select a new bowler:',
          showOnlyBowler: true,
          showOnlyStriker: false,
          showOnlyNonStriker: false,
          gradientColor: 'linear-gradient(45deg, #9C27B0 30%, #BA68C8 90%)'
        };
  // returning bowler change context
        return context;
      } else if (changePlayerType === 'striker') {
        const context = {
          title: `🔄 Change Striker (${changePlayerReason})`,
          message: 'Please select a new striker:',
          showOnlyBowler: false,
          showOnlyStriker: true,
          showOnlyNonStriker: false,
          gradientColor: 'linear-gradient(45deg, #FF5722 30%, #FF8A65 90%)'
        };
  // returning striker change context
        return context;
      } else if (changePlayerType === 'nonStriker') {
        const context = {
          title: `🔄 Change Non-Striker (${changePlayerReason})`,
          message: 'Please select a new non-striker:',
          showOnlyBowler: false,
          showOnlyStriker: false,
          showOnlyNonStriker: true,
          gradientColor: 'linear-gradient(45deg, #607D8B 30%, #90A4AE 90%)'
        };
  // returning nonStriker change context
        return context;
      }
    }
    
    if (isOverCompleted) {
      const context = {
        title: '🎯 Over Completed - Select New Bowler',
        message: 'The over is completed. Please select a new bowler to continue:',
        showOnlyBowler: true,
        showOnlyStriker: false,
        showOnlyNonStriker: false,
        gradientColor: 'linear-gradient(45deg, #FF9800 30%, #FFB74D 90%)'
      };
  // returning over completed context
      return context;
    } else if (isWaitingForNewBatsman) {
      const context = {
        title: '🏏 Wicket! Select New Batsman',
        message: 'A wicket has been taken. Please select a new striker to continue:',
        showOnlyBowler: false,
        showOnlyStriker: true,
        showOnlyNonStriker: false,
        gradientColor: 'linear-gradient(45deg, #f44336 30%, #e57373 90%)'
      };
  // returning wicket context
      return context;
    } else {
      const context = {
        title: '🏏 Select Players to Start Match',
        message: `Please select the striker, non-striker, and bowler to ${match && match.innings.length > 1 && currentInnings === 1 ? 'continue with the match' : 'start the match'}:`,
        showOnlyBowler: false,
        showOnlyStriker: false,
        showOnlyNonStriker: false,
        gradientColor: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'
      };
      // returning default match start context
      return context;
    }
  }, [isOverCompleted, isWaitingForNewBatsman, match, currentInnings, changePlayerType, changePlayerReason]);

  // Helper function to check if required selections are made based on context
  const areRequiredSelectionsComplete = useCallback(() => {
    const context = getDialogContext();

    if (context.showOnlyBowler) {
      // If user is in a focused bowler-change flow, allow pending selection to satisfy requirement
      return !!(bowler || pendingBowlerChange);
    } else if (context.showOnlyStriker) {
      return !!striker && striker !== nonStriker;
    } else if ((context as any).showOnlyNonStriker) {
      return !!nonStriker && striker !== nonStriker;
    } else {
      return arePlayersSelected();
    }
  }, [getDialogContext, bowler, striker, nonStriker, arePlayersSelected, pendingBowlerChange]);

  // Function to handle starting/continuing match with player selection
  const handleStartOrContinueMatch = async () => {
    // Check if there are enough batsmen to start/continue the match
    const availableBatsmen = getAvailableBatsmen();
    
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
                currentOverBalls: inning.currentOverBalls || [],
                recentBalls: inning.recentBalls || []
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
          
          // Clear any existing errors (local inline validation) — keep as-is
          setError('');
          
        } catch (error: any) {
          toast.showError('Error completing first innings due to insufficient batsmen');
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
                currentOverBalls: inning.currentOverBalls || [],
                recentBalls: inning.recentBalls || []
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
          
          // Clear any existing errors (local inline validation) — keep as-is
          setError('');
          
        } catch (error: any) {
          toast.showError('Error ending match due to insufficient batsmen');
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
    return checkMatchEndHelper(updatedMatch, currentInnings);
  }, [currentInnings]);

  // Shared function to clean match data for API calls (extracted to utils)
  const cleanMatchData = cleanMatchDataHelper;

  const fetchPlayers = useCallback(async () => {
    try {
      const { data } = await playerService.getAll();
      setPlayers(data);
    } catch (error) {
      toast.showError('Error fetching players');
      console.error('Error:', error);
    }
  }, [toast]);

  const fetchMatch = useCallback(async () => {
    try {
      if (!matchId) return;
      const { data } = await matchService.getById(matchId);
      setMatch(data);
      
      // Sync currentInnings state with match data
      if (data && typeof data.currentInnings === 'number') {
        // Sync currentInnings from server data
        setCurrentInnings(data.currentInnings);
      } else {
        setCurrentInnings(0);
      }
      
      // Refresh players data to ensure team membership is up to date
      await fetchPlayers();
      
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
          
          // FIXED: Restore current over's ball-by-ball history when resuming match (debug logs removed)
          
          // WORKAROUND: Check localStorage for current over data as backup
          const matchStorageKey = `currentOverBalls_${matchId}_${currentInnings}`;
          const storedOverBalls = localStorage.getItem(matchStorageKey);
          
          // Helper function for fallback reconstruction
          const fallbackReconstruction = () => {            
            const ballsInCurrentOver = currentBall || (currentState?.currentBall || 0);
            
            if (ballsInCurrentOver > 0) {
              const reconstructedBalls: BallOutcome[] = [];
              for (let i = 0; i < ballsInCurrentOver; i++) {
                reconstructedBalls.push({
                  ballNumber: i + 1,
                  runs: 0,
                  isWicket: false
                });
              }
              
              setCurrentOverBalls(reconstructedBalls);
              currentInning.currentOverBalls = reconstructedBalls;
            } else {
              setCurrentOverBalls([]);
            }
          };
          if (currentInning.currentOverBalls && currentInning.currentOverBalls.length > 0) {
            setCurrentOverBalls(currentInning.currentOverBalls);

          } else if (storedOverBalls) {
            try {
              const parsedBalls = JSON.parse(storedOverBalls);
              setCurrentOverBalls(parsedBalls);
              // Also update the innings data
              currentInning.currentOverBalls = parsedBalls;
            } catch (error) {
              console.error('Error parsing localStorage currentOverBalls:', error);
              // Fall back to reconstruction logic
              fallbackReconstruction();
            }

          } else {
            fallbackReconstruction();
          }
        } else if (totalBalls > 0 && currentBall === 0) {
          // If total balls is multiple of 6, over is completed - need new bowler
          setIsOverCompleted(true);
          setIsOverInProgress(false);
          setCurrentOverBalls([]);
        }
        
        // LIVE COMMENTARY FIX: Initialize recentBalls if not present
        if (!currentInning.recentBalls) {
          // If we have currentOverBalls, use them as initial recentBalls
          if (currentInning.currentOverBalls && currentInning.currentOverBalls.length > 0) {
            currentInning.recentBalls = [...currentInning.currentOverBalls];

          } else {
            currentInning.recentBalls = [];

          }
        } else {

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
  toast.showError('Error fetching match details');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [matchId, currentInnings, fetchPlayers, toast]);

  useEffect(() => {
    fetchMatch();
    fetchPlayers();
  }, [fetchMatch, fetchPlayers]);

  // Refresh players data periodically to catch team assignment changes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPlayers();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [fetchPlayers]);

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

  // Save recentBalls initialization to server to prevent mock data regeneration
  useEffect(() => {
    const saveRecentBallsInitialization = async () => {
      if (match && match._id && match.innings && match.innings.length > 0) {
        const currentInning = match.innings[currentInnings];
        
        // Check if we just initialized recentBalls and it needs to be saved
        if (currentInning && currentInning.recentBalls && 
            Array.isArray(currentInning.recentBalls) && 
            currentInning.recentBalls.length > 0 &&
            currentInning.currentOverBalls &&
            currentInning.recentBalls.length === currentInning.currentOverBalls.length) {
          
          try {
            const cleanedMatch = {
              ...match,
              _id: match._id
            };
            await matchService.updateScore(match._id, cleanedMatch);

          } catch (error) {
            console.error('Failed to save recentBalls initialization:', error);
          }
        }
      }
    };
    
    saveRecentBallsInitialization();
  }, [match, currentInnings]);

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

  // Handlers for player changes during match
  const handlePlayerChange = (playerType: 'striker' | 'nonStriker' | 'bowler') => {
    setChangePlayerType(playerType);
    setIsPlayerChangeDialogOpen(true);
    // mark that a player-change flow has started
    setIsPlayerChangeInProgress(true);
  };

  const handlePlayerChangeSubmit = () => {
    // Close the change dialog and open the player selection dialog
    setIsPlayerChangeDialogOpen(false);
    setIsPlayerSelectionDialogOpen(true);
    
    // Set the context for player selection dialog based on change type
    if (changePlayerType === 'bowler') {
      // For bowler change, set only bowler selection
      setIsOverCompleted(false);
      setIsWaitingForNewBatsman(false);
    } else if (changePlayerType === 'striker') {
      // For striker change, only set waiting-for-new-batsman when the change
      // is due to injury/retire_hurt. Tactical or other changes shouldn't trigger
      // the wicket/new-batsman flow.
      setIsOverCompleted(false);
      if (changePlayerReason === 'injury' || changePlayerReason === 'retire_hurt') {
        setIsWaitingForNewBatsman(true);
      } else {
        setIsWaitingForNewBatsman(false);
      }
    }
    // Note: For non-striker changes, we'll handle in the selection dialog context
  };

  const handlePlayerChangeCancel = () => {
    setIsPlayerChangeDialogOpen(false);
    setChangePlayerType(null);
    setChangePlayerReason('');
    // canceling the change should clear the in-progress flag
    setIsPlayerChangeInProgress(false);
  };

  // Handler for PlayerSelectionDialog's Continue button (moved from inline JSX)
  const handleDialogContinue = async () => {
    if (!areRequiredSelectionsComplete()) return;

    setUserDismissedDialog(false);
    setIsPlayerSelectionDialogOpen(false);

    if (changePlayerType) {
      // Player change flow
      if (match) {
        const updatedMatch = { ...match } as Match;
        updatedMatch.currentInnings = currentInnings;
        const currInning = updatedMatch.innings[currentInnings];
        if (!currInning.battingStats) currInning.battingStats = [];

        const ensureBattingStat = (playerId: string | undefined, isOnStrike: boolean) => {
          if (!playerId) return;
          let stat = currInning.battingStats.find((s: any) => (typeof s.player === 'string' ? s.player : s.player._id) === playerId);
          if (!stat) {
            currInning.battingStats.push({ player: playerId, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, strikeRate: 0, isOnStrike });
          } else {
            stat.isOnStrike = isOnStrike;
          }
        };

        ensureBattingStat(striker || undefined, true);
        ensureBattingStat(nonStriker || undefined, false);

        currInning.battingStats.forEach((s: any) => {
          const pid = typeof s.player === 'string' ? s.player : s.player._id;
          s.isOnStrike = pid === striker;
        });

        setMatch(updatedMatch);

        const newStrikerStat = currInning.battingStats.find((st: any) => (typeof st.player === 'string' ? st.player : st.player._id) === striker);
        const newNonStrikerStat = currInning.battingStats.find((st: any) => (typeof st.player === 'string' ? st.player : st.player._id) === nonStriker);
        setStrikerStats({ runs: newStrikerStat?.runs || 0, balls: newStrikerStat?.balls || 0 });
        setNonStrikerStats({ runs: newNonStrikerStat?.runs || 0, balls: newNonStrikerStat?.balls || 0 });
      }

      if (changePlayerType === 'bowler') {
        try {
          if (match && matchId) {
            const updatedMatch = { ...match } as Match;
            updatedMatch.currentInnings = currentInnings;
            const inning = updatedMatch.innings[currentInnings];
            if (!inning.bowlingStats) inning.bowlingStats = [];

            const newBowlerId = pendingBowlerChange || bowler;
            if (newBowlerId) {
              let bstat = inning.bowlingStats.find((b: any) => (typeof b.player === 'string' ? b.player : b.player._id) === newBowlerId);
              if (!bstat) {
                bstat = { player: newBowlerId, overs: 0, balls: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0, economy: 0 };
                inning.bowlingStats.push(bstat as any);
              }

              let cleaned: Match;
              try {
                cleaned = cleanMatchData ? cleanMatchData(updatedMatch) : updatedMatch;
              } catch (e) {
                cleaned = updatedMatch;
              }

              const { data } = await matchService.updateScore(matchId, cleaned);
              setMatch(data);
            }
          }
        } catch (err) {
          console.error('Failed to persist bowler selection from dialog:', err);
        }
      }

      setChangePlayerType(null);
      setChangePlayerReason('');
      setIsPlayerChangeInProgress(false);
      if (!isOverInProgress) setIsOverInProgress(true);
      setIsOverCompleted(false);
      setOverCompletionMessage('');
      setPendingBowlerChange('');
      setUserDismissedDialog(false);
      return;
    }

    if (isOverCompleted) {
      setIsOverCompleted(false);
      setOverCompletionMessage('');
      setIsOverInProgress(true);
      setCurrentOverBalls([]);
      if (match && match.innings && match.innings[currentInnings]) {
        match.innings[currentInnings].currentOverBalls = [];
      }
      const matchStorageKey = `currentOverBalls_${matchId}_${currentInnings}`;
      localStorage.setItem(matchStorageKey, JSON.stringify([]));
      return;
    }

    if (isWaitingForNewBatsman) {
      setIsWaitingForNewBatsman(false);
      return;
    }

    setIsOverInProgress(true);
    setIsOverCompleted(false);
    setOverCompletionMessage('');
  };

  // determine if the current user is the match creator (owner)
  const isMatchCreator = match && currentUserId && (() => {
    try {
      if (!match) return false;
      const cb = (match as any).createdBy;
      if (!cb) return false;
      if (typeof cb === 'string') return cb === currentUserId;
      if (typeof cb === 'object') return (cb._id || cb.toString()) === currentUserId || cb === currentUserId;
      return false;
    } catch (e) {
      return false;
    }
  })();

  // whether the current user can edit/score this match
  const canEdit = isAdmin || isSuperAdmin || isMatchCreator;

  // Auto-open player selection dialog when match loads if no players selected
  useEffect(() => {
    // Only auto-open the full player-selection dialog when the innings is just starting
    // (no players selected, no balls bowled). Other flows (wicket, over-complete, player-change)
    // use their dedicated dialogs and effects.
    if (!match || !canEdit || isPlayerSelectionDialogOpen || loading || userDismissedDialog) return;

    const current = match.innings && match.innings.length > 0 ? match.innings[currentInnings] : undefined;
    const noSelectionsMade = (!striker && !nonStriker && !bowler) &&
      (!current || !current.battingStats || current.battingStats.length === 0) &&
      ((current?.balls || 0) === 0);

    // Guard: if any other flow is active (over completion, waiting for new batsman after wicket,
    // an explicit player-change flow, or mid-over bowler-change dialog), do NOT auto-open the full dialog.
    const otherFlowActive = isOverCompleted || isWaitingForNewBatsman || !!changePlayerType || isPlayerChangeInProgress || isBowlerChangeDialogOpen;

    if (noSelectionsMade && !otherFlowActive) {
      // Small delay to ensure UI has rendered
      const timer = setTimeout(() => {
        setIsPlayerSelectionDialogOpen(true);
      }, 500);

      return () => clearTimeout(timer);
    } else if (noSelectionsMade && !hasAutoOpenedOnEnter && !userDismissedDialog && !isPlayerSelectionDialogOpen && !loading && canEdit) {
      // If we're entering the live scoring and selections are empty, open the main dialog
      // even if some other transient flags exist. This ensures users landing on the page
      // see the full striker/non-striker/bowler selector when no players are set.
      setHasAutoOpenedOnEnter(true);
      const timer2 = setTimeout(() => {
        setIsPlayerSelectionDialogOpen(true);
      }, 300);
      return () => clearTimeout(timer2);
    }
  }, [match, canEdit, isPlayerSelectionDialogOpen, loading, userDismissedDialog, striker, nonStriker, bowler, currentInnings, isOverCompleted, isWaitingForNewBatsman, changePlayerType, isPlayerChangeInProgress, isBowlerChangeDialogOpen, hasAutoOpenedOnEnter]);

  // Auto-open player selection dialog when over is completed and needs new bowler
  useEffect(() => {
    // Only auto-open over-completion selection when no other player-change flow is active
    if (
      isOverCompleted &&
      canEdit &&
      !isPlayerSelectionDialogOpen &&
      !isPlayerChangeInProgress &&
      !changePlayerType &&
      !isBowlerChangeDialogOpen &&
      !isMatchCompleted
    ) {
      // Reset dismissed flag for over completion - this is a required selection
      setUserDismissedDialog(false);

      // Delay to allow UI to update the over completion alert first
      const timer = setTimeout(() => {
        // Open a focused bowler-change flow instead of the full main dialog.
        // This prevents the full player-selection popup from appearing during bowler change.
        setChangePlayerType('bowler');
        setChangePlayerReason('over_completed');
        setIsPlayerChangeInProgress(true);
        setIsPlayerSelectionDialogOpen(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isOverCompleted, canEdit, isPlayerSelectionDialogOpen, isPlayerChangeInProgress, changePlayerType, isBowlerChangeDialogOpen, isMatchCompleted]);
  // include isMatchCompleted to ensure we don't auto-open over completion after match ended

  // Auto-handle insufficient batsmen when selection dialog is open
  useEffect(() => {
    if (!match || !isPlayerSelectionDialogOpen || autoInsufficientHandled) return;

    try {
      const available = getAvailableBatsmen();
      if (available.length < 2) {
        // Mark as handled to avoid repeated attempts
        setAutoInsufficientHandled(true);

        (async () => {
          const updatedMatch = { ...match } as Match;
          updatedMatch.currentInnings = currentInnings;
          const currentInning = updatedMatch.innings[currentInnings];

          // If first innings, mark it completed and prepare second innings
          if (currentInnings === 0) {
            currentInning.isCompleted = true;
            try {
              // Prepare second innings if not present
              if (!updatedMatch.innings[1]) {
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
                  currentState: { currentOver: 0, currentBall: 0, lastBallRuns: 0 },
                  extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
                  runRate: 0,
                  currentOverBalls: []
                };
                updatedMatch.innings.push(newInnings);
              }

              const cleaned = cleanMatchData ? cleanMatchData(updatedMatch) : updatedMatch;
              if (!matchId) {
                console.error('Cannot auto-complete first innings: missing matchId');
                toast.showError('Internal error: missing match id');
                return;
              }
              const { data } = await matchService.updateScore(matchId, cleaned);
              setMatch(data);
              setIsFirstInningsComplete(true);
              setOverCompletionMessage(`First innings skipped - not enough batsmen (${available.length} available). Click "Start Second Innings" to continue.`);
              setIsOverCompleted(true);
              // Close selection dialog (no players to select)
              setIsPlayerSelectionDialogOpen(false);
            } catch (err) {
              console.error('Error auto completing first innings due to insufficient batsmen:', err);
              toast.showError('Error auto completing first innings due to insufficient batsmen');
            }
          } else {
            // Second innings - end match immediately
            try {
              updatedMatch.status = 'completed';
              updatedMatch.innings[1].isCompleted = true;

              const firstInnings = updatedMatch.innings[0];
              const secondInnings = updatedMatch.innings[1];
              const firstScore = firstInnings.totalRuns || 0;
              const secondScore = secondInnings.totalRuns || 0;

              if (firstScore > secondScore) {
                const firstName = typeof firstInnings.battingTeam === 'object' && firstInnings.battingTeam ? firstInnings.battingTeam.name : 'Team 1';
                updatedMatch.result = `${firstName} won by ${firstScore - secondScore} runs`;
              } else if (secondScore > firstScore) {
                const secondName = typeof secondInnings.battingTeam === 'object' && secondInnings.battingTeam ? secondInnings.battingTeam.name : 'Team 2';
                updatedMatch.result = `${secondName} won by ${secondScore - firstScore} runs`;
              } else {
                updatedMatch.result = 'Match ended in a tie';
              }

              const cleaned = cleanMatchData ? cleanMatchData(updatedMatch) : updatedMatch;
              if (!matchId) {
                console.error('Cannot auto-end match: missing matchId');
                toast.showError('Internal error: missing match id');
                return;
              }
              const { data } = await matchService.updateScore(matchId, cleaned);
              setMatch(data);
              setIsMatchCompleted(true);
              // Clear over-completed instructions since match is finished
              setIsOverCompleted(false);
              setOverCompletionMessage(updatedMatch.result || `Match completed - not enough batsmen for second innings (${available.length} available).`);
              setIsPlayerSelectionDialogOpen(false);
            } catch (err) {
              console.error('Error auto ending match due to insufficient batsmen:', err);
              toast.showError('Error auto ending match due to insufficient batsmen');
            }
          }
        })();
      }
    } catch (e) {
      console.error('Auto insufficient batsmen check failed:', e);
    }
  }, [match, isPlayerSelectionDialogOpen, autoInsufficientHandled, currentInnings, getAvailableBatsmen, matchId, cleanMatchData, toast]);

  // If match becomes completed with a result, ensure the match-end dialog is opened
  // removed match-end dialog effect; we now render a full-screen match-completed view when isMatchCompleted is true

  // Auto-open player selection dialog when waiting for new batsman after wicket
  useEffect(() => {
    // For wicket flows we should open a focused selection for the new batsman
    // (only striker change) rather than the full innings-start main popup.
    if (isWaitingForNewBatsman && !isPlayerChangeInProgress && canEdit) {
      // Reset dismissed flag for wicket situations - this is a required selection
      setUserDismissedDialog(false);

      // Start a focused player-change flow for striker replacement
      setChangePlayerType('striker');
      setChangePlayerReason('wicket');
      setIsPlayerChangeInProgress(true);
      setIsPlayerSelectionDialogOpen(true);
    }
  }, [isWaitingForNewBatsman, canEdit, isPlayerSelectionDialogOpen, isPlayerChangeInProgress, toast]);

  const handleBallOutcome = async (runs: number, isExtra: boolean = false) => {
    if (!match || !matchId) return;

    if (!isOverInProgress) {
      toast.showError('Please start a new over first');
      return;
    }

    const updatedMatch = { ...match };
    // CRITICAL FIX: Ensure updatedMatch.currentInnings matches our state
    updatedMatch.currentInnings = currentInnings;
    const currentInning = updatedMatch.innings[currentInnings];

    // Check if currentInning exists
    if (!currentInning) {
  toast.showError('Current inning not found');
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

    // Save undo state BEFORE making any changes
    const preBallStrikerStats = currentInning.battingStats && Array.isArray(currentInning.battingStats)
      ? currentInning.battingStats.find((stat) => (typeof stat.player === 'string' ? stat.player : stat.player._id) === striker)
      : null;
    const preBallNonStrikerStats = currentInning.battingStats && Array.isArray(currentInning.battingStats)
      ? currentInning.battingStats.find((stat) => (typeof stat.player === 'string' ? stat.player : stat.player._id) === nonStriker)
      : null;

    const undoAction = createUndoAction('ball_outcome', { runs, isExtra }, currentInning, {
      striker,
      nonStriker,
      bowler,
      strikerStats: preBallStrikerStats ? {
        runs: preBallStrikerStats.runs,
        balls: preBallStrikerStats.balls,
        fours: preBallStrikerStats.fours || 0,
        sixes: preBallStrikerStats.sixes || 0,
        isOut: preBallStrikerStats.isOut || false,
        dismissalType: preBallStrikerStats.dismissalType,
        howOut: preBallStrikerStats.howOut,
        dismissedBy: preBallStrikerStats.dismissedBy,
        strikeRate: preBallStrikerStats.strikeRate || 0,
        isOnStrike: preBallStrikerStats.isOnStrike || false
      } : undefined,
      nonStrikerStats: preBallNonStrikerStats ? {
        runs: preBallNonStrikerStats.runs,
        balls: preBallNonStrikerStats.balls,
        fours: preBallNonStrikerStats.fours || 0,
        sixes: preBallNonStrikerStats.sixes || 0,
        isOut: preBallNonStrikerStats.isOut || false,
        dismissalType: preBallNonStrikerStats.dismissalType,
        howOut: preBallNonStrikerStats.howOut,
        dismissedBy: preBallNonStrikerStats.dismissedBy,
        strikeRate: preBallNonStrikerStats.strikeRate || 0,
        isOnStrike: preBallNonStrikerStats.isOnStrike || false
      } : undefined,
      bowlerStats: { ...bowlerStats }
    });

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

      // Reset consecutive wickets counter for the bowler on a legal non-wicket delivery
      try {
        setConsecutiveWicketsByBowler(prev => ({ ...prev, [bowler]: 0 }));
      } catch (e) { /* ignore */ }

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
        timestamp: Date.now(),
        sequenceNumber: currentInning.balls // Use updated total balls as sequence (already incremented above)
      };
      
      // Add extras field only if it's an extra ball
      if (isExtra) {
        ballOutcome.extras = { type: 'wide', runs };
      }
      
      const newCurrentOverBalls = [...currentOverBalls, ballOutcome];
      setCurrentOverBalls(newCurrentOverBalls);
      
      // FIXED: Store current over balls in match data for persistence
      currentInning.currentOverBalls = newCurrentOverBalls;
      
      // IMPORTANT: For matches that don't have currentOverBalls in database,
      // ensure we always update this field for future consistency
      match.innings[currentInnings].currentOverBalls = newCurrentOverBalls;
      
      // LIVE COMMENTARY FIX: Maintain last 12 balls for live commentary
      const currentRecentBalls = currentInning.recentBalls || [];
      const newRecentBalls = [...currentRecentBalls, ballOutcome];
      // Keep only last 12 balls for live commentary
      if (newRecentBalls.length > 12) {
        newRecentBalls.splice(0, newRecentBalls.length - 12);
      }
  currentInning.recentBalls = newRecentBalls;
  match.innings[currentInnings].recentBalls = newRecentBalls;
      
      // WORKAROUND: Also save to localStorage as backup until server schema is applied
      const matchStorageKey = `currentOverBalls_${matchId}_${currentInnings}`;
      localStorage.setItem(matchStorageKey, JSON.stringify(newCurrentOverBalls));

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
                    runRate: inning.runRate || 0,
                    requiredRunRate: inning.requiredRunRate,
                    currentOverBalls: inning.currentOverBalls || [],
                    recentBalls: inning.recentBalls || []
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
          // CRITICAL FIX: Clear current over balls when over completes
          setCurrentOverBalls([]);
          if (match && match.innings && match.innings[currentInnings]) {
            match.innings[currentInnings].currentOverBalls = [];
          }
          // Over completed - cleared currentOverBalls (log removed)
        }
        
        // Mark bowler's last bowling over
        if (bowlerBowlingStats) {
            bowlerBowlingStats.lastBowledOver = completeInningsOvers;
            // Detect maiden for the completed over (use currentInning.currentOverBalls if available)
            try {
              const overBallsForMaiden: BallOutcome[] = currentInning.currentOverBalls || [];
              detectMaidenForOver(typeof bowlerBowlingStats.player === 'string' ? bowlerBowlingStats.player : (bowlerBowlingStats.player as any)?._id, overBallsForMaiden);
            } catch (e) { /* ignore */ }
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
            extras: inning.extras || {
              wides: 0,
              noBalls: 0,
              byes: 0,
              legByes: 0,
              total: 0
            },
            runRate: inning.runRate || 0,
            requiredRunRate: inning.requiredRunRate,
            currentOverBalls: inning.currentOverBalls || [],
            recentBalls: inning.recentBalls || []
          }))
        };
      };

      const cleanedMatch = cleanMatchData(updatedMatch);

  // Saving to server (debug logs removed)
  const { data } = await matchService.updateScore(matchId, cleanedMatch);

  // Server response received (debug logs removed)
      
      // Update local state with the response data to keep in sync
      setMatch(data);

      // Track action for undo
      addToUndoHistory(undoAction);
    } catch (error: any) {
      toast.showError('Error updating match');
      console.error('Error updating match:', error?.response?.data || error?.message || error);
    }
  };

  const handleExtra = async (type: string, runs: number = 1) => {
    if (!match || !matchId) return;

    if (!isOverInProgress) {
      toast.showError('Please start a new over first');
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

    // CRITICAL FIX: Create undo action BEFORE making any changes
    const preExtraStrikerStats = currentInning.battingStats && Array.isArray(currentInning.battingStats)
      ? currentInning.battingStats.find((stat) => (typeof stat.player === 'string' ? stat.player : stat.player._id) === striker)
      : null;
    const preExtraNonStrikerStats = currentInning.battingStats && Array.isArray(currentInning.battingStats)
      ? currentInning.battingStats.find((stat) => (typeof stat.player === 'string' ? stat.player : stat.player._id) === nonStriker)
      : null;

    const undoAction = createUndoAction('extra', { type, runs }, currentInning, {
      striker,
      nonStriker,
      bowler,
      strikerStats: preExtraStrikerStats ? {
        runs: preExtraStrikerStats.runs,
        balls: preExtraStrikerStats.balls,
        fours: preExtraStrikerStats.fours || 0,
        sixes: preExtraStrikerStats.sixes || 0,
        isOut: preExtraStrikerStats.isOut || false,
        dismissalType: preExtraStrikerStats.dismissalType,
        howOut: preExtraStrikerStats.howOut,
        dismissedBy: preExtraStrikerStats.dismissedBy,
        strikeRate: preExtraStrikerStats.strikeRate || 0,
        isOnStrike: preExtraStrikerStats.isOnStrike || false
      } : undefined,
      nonStrikerStats: preExtraNonStrikerStats ? {
        runs: preExtraNonStrikerStats.runs,
        balls: preExtraNonStrikerStats.balls,
        fours: preExtraNonStrikerStats.fours || 0,
        sixes: preExtraNonStrikerStats.sixes || 0,
        isOut: preExtraNonStrikerStats.isOut || false,
        dismissalType: preExtraNonStrikerStats.dismissalType,
        howOut: preExtraNonStrikerStats.howOut,
        dismissedBy: preExtraNonStrikerStats.dismissedBy,
        strikeRate: preExtraNonStrikerStats.strikeRate || 0,
        isOnStrike: preExtraNonStrikerStats.isOnStrike || false
      } : undefined,
      bowlerStats: { ...bowlerStats }
    });
    addToUndoHistory(undoAction);

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
      case 'no-ball':
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
      case 'leg-bye':
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
    } else if (type === 'no-ball') {
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
        // CRITICAL FIX: Clear current over balls when over completes
        setCurrentOverBalls([]);
        if (match && match.innings && match.innings[currentInnings]) {
          match.innings[currentInnings].currentOverBalls = [];
        }
        // Over completed (extras) - cleared currentOverBalls (log removed)
        
        if (bowlerBowlingStats) {
            bowlerBowlingStats.lastBowledOver = completeInningsOvers;
            try {
              const overBallsForMaiden: BallOutcome[] = currentInning.currentOverBalls || [];
              detectMaidenForOver(typeof bowlerBowlingStats.player === 'string' ? bowlerBowlingStats.player : (bowlerBowlingStats.player as any)?._id, overBallsForMaiden);
            } catch (e) { /* ignore */ }
          }
      }
    }
    
    // Add extra ball to current over balls for commentary
    const extraBall: BallOutcome = {
      ballNumber: type === 'wide' || type === 'no-ball' ? 0 : (currentOverBalls.length + 1), // Wides/no-balls = 0, byes/leg-byes = current ball position
      runs,
      isWicket: false,
      extras: {
        type: type as 'wide' | 'no-ball' | 'bye' | 'leg-bye',
        runs
      },
      timestamp: Date.now(),
      sequenceNumber: currentInning.balls || 0 // Use current total balls as sequence (already updated above)
    };
    
    const newCurrentOverBalls = [...currentOverBalls, extraBall];
    setCurrentOverBalls(newCurrentOverBalls);
    
    // FIXED: Store current over balls in match data for persistence
    currentInning.currentOverBalls = newCurrentOverBalls;
    
    // LIVE COMMENTARY FIX: Maintain last 12 balls for live commentary (extras)
    const currentRecentBalls = currentInning.recentBalls || [];
    const newRecentBalls = [...currentRecentBalls, extraBall];
    // Keep only last 12 balls for live commentary
    if (newRecentBalls.length > 12) {
      newRecentBalls.splice(0, newRecentBalls.length - 12);
    }
    currentInning.recentBalls = newRecentBalls;
    match.innings[currentInnings].recentBalls = newRecentBalls;

    
    // WORKAROUND: Also save to localStorage as backup until server schema is applied
    const matchStorageKey = `currentOverBalls_${matchId}_${currentInnings}`;
    localStorage.setItem(matchStorageKey, JSON.stringify(newCurrentOverBalls));
  // Saved extra ball currentOverBalls to localStorage as backup (log removed)
    
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
    if ((type === 'bye' || type === 'leg-bye') && runs % 2 === 1) {
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

    // Reset consecutive wicket counter for byes/leg-byes (these are legal deliveries)
    try {
      if (type === 'bye' || type === 'leg-bye') {
        setConsecutiveWicketsByBowler(prev => ({ ...prev, [bowler]: 0 }));
      }
    } catch (e) { /* ignore */ }

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
            requiredRunRate: inning.requiredRunRate,
            currentOverBalls: inning.currentOverBalls || [],
            recentBalls: inning.recentBalls || []
          }))
        };
      };

      const cleanedMatch = cleanMatchData(updatedMatch);
      const { data } = await matchService.updateScore(matchId, cleanedMatch);
      setMatch(data);
    } catch (error: any) {
      toast.showError('Error updating extras');
      console.error('Error updating extras:', error?.response?.data || error?.message || error);
    }
  };

  const handleWicket = async (type: string, howOut?: string, dismissedBy?: string) => {
    if (!match || !matchId) return;

    if (!isOverInProgress) {
      toast.showError('Please start a new over first');
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

    // CRITICAL FIX: Create undo action BEFORE making any changes
    const preWicketStrikerStats = currentInning.battingStats && Array.isArray(currentInning.battingStats)
      ? currentInning.battingStats.find((stat) => (typeof stat.player === 'string' ? stat.player : stat.player._id) === striker)
      : null;
    const preWicketNonStrikerStats = currentInning.battingStats && Array.isArray(currentInning.battingStats)
      ? currentInning.battingStats.find((stat) => (typeof stat.player === 'string' ? stat.player : stat.player._id) === nonStriker)
      : null;

    const undoAction = createUndoAction('wicket', { type, howOut, dismissedBy }, currentInning, {
      striker,
      nonStriker,
      bowler,
      strikerStats: preWicketStrikerStats ? {
        runs: preWicketStrikerStats.runs,
        balls: preWicketStrikerStats.balls,
        fours: preWicketStrikerStats.fours || 0,
        sixes: preWicketStrikerStats.sixes || 0,
        isOut: preWicketStrikerStats.isOut || false,
        dismissalType: preWicketStrikerStats.dismissalType,
        howOut: preWicketStrikerStats.howOut,
        dismissedBy: preWicketStrikerStats.dismissedBy,
        strikeRate: preWicketStrikerStats.strikeRate || 0,
        isOnStrike: preWicketStrikerStats.isOnStrike || false
      } : undefined,
      nonStrikerStats: preWicketNonStrikerStats ? {
        runs: preWicketNonStrikerStats.runs,
        balls: preWicketNonStrikerStats.balls,
        fours: preWicketNonStrikerStats.fours || 0,
        sixes: preWicketNonStrikerStats.sixes || 0,
        isOut: preWicketNonStrikerStats.isOut || false,
        dismissalType: preWicketNonStrikerStats.dismissalType,
        howOut: preWicketNonStrikerStats.howOut,
        dismissedBy: preWicketNonStrikerStats.dismissedBy,
        strikeRate: preWicketNonStrikerStats.strikeRate || 0,
        isOnStrike: preWicketNonStrikerStats.isOnStrike || false
      } : undefined,
      bowlerStats: { ...bowlerStats }
    });
    addToUndoHistory(undoAction);

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

    // HAT-TRICK detection: update consecutive wickets by bowler
    try {
      const prevConsec = consecutiveWicketsByBowler[bowler] || 0;
      const newConsec = prevConsec + 1;
      setConsecutiveWicketsByBowler(prev => ({ ...prev, [bowler]: newConsec }));
      if (newConsec >= 3) {
        const bowlerName = players.find(p => p._id === bowler)?.name || '';
        setHatTrickInfo({ bowlerId: bowler, bowlerName });
        toast.showSuccess(`${bowlerName || 'Bowler'} achieved a HAT-TRICK!`);
        // reset counter after triggering
        setConsecutiveWicketsByBowler(prev => ({ ...prev, [bowler]: 0 }));
      }
    } catch (e) { console.error('Hat-trick detection error', e); }
    
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
    // Resolve fielder ID to name for better commentary
    const fielderName = dismissedBy ? (players.find(p => p._id === dismissedBy)?.name || dismissedBy) : '';
    
    const wicketBall: BallOutcome = {
      ballNumber: currentOverBalls.length + 1, // Ball number within current over (1-6)
      runs: 0,
      isWicket: true,
      dismissalType: type as any,
      fielder: fielderName,
      timestamp: Date.now(),
      sequenceNumber: currentInning.balls || 0 // Use current balls count as sequence for wickets
    };
    
    const newCurrentOverBalls = [...currentOverBalls, wicketBall];
    setCurrentOverBalls(newCurrentOverBalls);
    
    // FIXED: Store current over balls in match data for persistence
    currentInning.currentOverBalls = newCurrentOverBalls;
    
    // LIVE COMMENTARY FIX: Maintain last 12 balls for live commentary (wicket)
    const currentRecentBalls = currentInning.recentBalls || [];
    const newRecentBalls = [...currentRecentBalls, wicketBall];
    // Keep only last 12 balls for live commentary
    if (newRecentBalls.length > 12) {
      newRecentBalls.splice(0, newRecentBalls.length - 12);
    }
    currentInning.recentBalls = newRecentBalls;
    match.innings[currentInnings].recentBalls = newRecentBalls;

    
    // WORKAROUND: Also save to localStorage as backup until server schema is applied
    const matchStorageKey = `currentOverBalls_${matchId}_${currentInnings}`;
    localStorage.setItem(matchStorageKey, JSON.stringify(newCurrentOverBalls));
  // Saved wicket ball currentOverBalls to localStorage as backup (log removed)

    // Check if no more batsmen are available (for teams with less than 10 players)
    const availableBatsmen = getAvailableBatsmen();
    // Need at least 2 batsmen to continue (striker + non-striker)
    // Current striker is now out, so we need at least 2 remaining players
    const availableBatsmenCount = availableBatsmen.length;
  // Available batsmen after wicket computed (log removed)
    
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
          toast.showError('Error saving innings completion');
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
          toast.showError('Error saving match completion');
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
          toast.showError('Error saving innings completion');
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
          toast.showError('Error saving match completion');
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
        try {
          const overBallsForMaiden: BallOutcome[] = currentInning.currentOverBalls || [];
          detectMaidenForOver(typeof bowlerBowlingStats.player === 'string' ? bowlerBowlingStats.player : (bowlerBowlingStats.player as any)?._id, overBallsForMaiden);
        } catch (e) { /* ignore */ }
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
            requiredRunRate: inning.requiredRunRate,
            currentOverBalls: inning.currentOverBalls || [],
            recentBalls: inning.recentBalls || []
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
  toast.showError('Error recording wicket');
      console.error('Error recording wicket:', error?.response?.data || error?.message || error);
    }
  };

  // Undo functionality
  const addToUndoHistory = useCallback((action: UndoAction) => {
    setUndoHistory(prev => {
      const newHistory = [...prev, action];
      // Keep only last 10 actions to prevent memory issues
      if (newHistory.length > 10) {
        newHistory.shift();
      }
      setCanUndo(newHistory.length > 0);
      return newHistory;
    });
  }, []);

  const handleUndo = async () => {
    if (!match || !matchId || undoHistory.length === 0) return;

    const lastAction = undoHistory[undoHistory.length - 1];
  const updatedMatch = { ...match };
  updatedMatch.currentInnings = currentInnings;

  // Apply undo snapshot using shared helper (this mutates the match inning and returns UI state)
  const previousState = lastAction.matchState;
  const restored = applyUndoSnapshot(updatedMatch, previousState, currentInnings) as any;

    // Restore local UI state from helper result
    if (restored) {
      setCurrentOverBalls(restored.currentOverBalls || []);
      setStriker(restored.striker || '');
      setNonStriker(restored.nonStriker || '');
      setBowler(restored.bowler || '');
      setStrikerStats(restored.strikerStats || { runs: 0, balls: 0 });
      setNonStrikerStats(restored.nonStrikerStats || { runs: 0, balls: 0 });
      setBowlerStats(restored.bowlerStats || { overs: 0, runs: 0, wickets: 0, balls: 0 });
    }

    // Remove the undone action from history
    setUndoHistory(prev => {
      const newHistory = prev.slice(0, -1);
      setCanUndo(newHistory.length > 0);
      return newHistory;
    });

    // Save the restored state
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
            currentOverBalls: inning.currentOverBalls || [],
            recentBalls: inning.recentBalls || []
          }))
        };
      };

      const cleanedMatch = cleanMatchData(updatedMatch);
      const { data } = await matchService.updateScore(matchId, cleanedMatch);
      setMatch(data);
    } catch (error: any) {
  toast.showError('Error undoing action');
      console.error('Error undoing action:', error?.response?.data || error?.message || error);
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
            setCurrentOverBalls([]);
            if (match && match.innings && match.innings[currentInnings]) {
              match.innings[currentInnings].currentOverBalls = [];
            }
            // Over completed - cleared currentOverBalls (log removed)
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

    // Persist selection immediately so returning users see the chosen striker
    (async () => {
      try {
        if (!match || !matchId) return;
        const updatedMatch = { ...match } as Match;
        updatedMatch.currentInnings = currentInnings;
        const inning = updatedMatch.innings[currentInnings];

        // Ensure battingStats array exists
        if (!inning.battingStats) inning.battingStats = [];

        // Ensure striker exists in battingStats
        const ensureBattingStat = (playerId: string) => {
          if (!playerId) return;
          let stat = inning.battingStats.find((s: any) => (typeof s.player === 'string' ? s.player : s.player._id) === playerId);
          if (!stat) {
            stat = { player: playerId, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, strikeRate: 0, isOnStrike: false };
            inning.battingStats.push(stat as any);
          }
          return stat;
        };

        ensureBattingStat(newStriker);
        ensureBattingStat(nonStriker || '');

        // Mark isOnStrike flags
        inning.battingStats.forEach((s: any) => {
          const pid = typeof s.player === 'string' ? s.player : s.player._id;
          s.isOnStrike = pid === newStriker;
        });

        let cleaned: Match;
        try {
          cleaned = cleanMatchData ? cleanMatchData(updatedMatch) : updatedMatch;
        } catch (e) {
          cleaned = updatedMatch;
        }

        const { data } = await matchService.updateScore(matchId, cleaned);
        setMatch(data);
      } catch (err) {
        console.error('Failed to persist striker selection:', err);
      }
    })();
  };

  const handleNonStrikerChange = (event: SelectChangeEvent) => {
    const newNon = event.target.value;
    setNonStriker(newNon);

    // Persist non-striker selection immediately
    (async () => {
      try {
        if (!match || !matchId) return;
        const updatedMatch = { ...match } as Match;
        updatedMatch.currentInnings = currentInnings;
        const inning = updatedMatch.innings[currentInnings];
        if (!inning.battingStats) inning.battingStats = [];

        const ensureBattingStat = (playerId: string) => {
          if (!playerId) return;
          let stat = inning.battingStats.find((s: any) => (typeof s.player === 'string' ? s.player : s.player._id) === playerId);
          if (!stat) {
            stat = { player: playerId, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, strikeRate: 0, isOnStrike: false };
            inning.battingStats.push(stat as any);
          }
          return stat;
        };

        ensureBattingStat(striker || '');
        ensureBattingStat(newNon);

        inning.battingStats.forEach((s: any) => {
          const pid = typeof s.player === 'string' ? s.player : s.player._id;
          s.isOnStrike = pid === striker;
        });

        let cleaned: Match;
        try {
          cleaned = cleanMatchData ? cleanMatchData(updatedMatch) : updatedMatch;
        } catch (e) {
          cleaned = updatedMatch;
        }

        const { data } = await matchService.updateScore(matchId, cleaned);
        setMatch(data);
      } catch (err) {
        console.error('Failed to persist non-striker selection:', err);
      }
    })();
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
      // CRITICAL FIX: Clear current over balls when new over starts
      setCurrentOverBalls([]);
      if (match && match.innings && match.innings[currentInnings]) {
        match.innings[currentInnings].currentOverBalls = [];
      }
      // New over started - cleared currentOverBalls (log removed)
    }
    
    // Reset mid-over change permission after use
    if (allowBowlerChange) {
      setAllowBowlerChange(false);
      setBowlerChangeReason('');
    }

    // Persist bowler change immediately
    // If we're in a focused bowler-change flow (user is in the player-change dialog
    // and changePlayerType === 'bowler'), do NOT persist yet. Wait for the user to
    // confirm via the dialog's Continue button.
    if (isPlayerChangeInProgress && changePlayerType === 'bowler') {
      // just update local selection so the dialog shows the chosen bowler
      setPendingBowlerChange(newBowlerId);
      return;
    }

    (async () => {
      try {
        if (!match || !matchId) return;
        const updatedMatch = { ...match } as Match;
        updatedMatch.currentInnings = currentInnings;
        const inning = updatedMatch.innings[currentInnings];
        if (!inning.bowlingStats) inning.bowlingStats = [];

        // Ensure bowler exists in bowlingStats
        let bstat = inning.bowlingStats.find((b: any) => (typeof b.player === 'string' ? b.player : b.player._id) === newBowlerId);
        if (!bstat) {
          bstat = { player: newBowlerId, overs: 0, balls: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0, economy: 0 };
          inning.bowlingStats.push(bstat as any);
        }

        let cleaned: Match;
        try {
          cleaned = cleanMatchData ? cleanMatchData(updatedMatch) : updatedMatch;
        } catch (e) {
          cleaned = updatedMatch;
        }

        const { data } = await matchService.updateScore(matchId, cleaned);
        setMatch(data);
      } catch (err) {
        console.error('Failed to persist bowler selection:', err);
      }
    })();
    
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
        return teamId === String(secondInningsBattingTeamId);
      });
    });
    
    if (teamPlayers.length < 2) {
  toast.showError(`Second innings cannot start - only ${teamPlayers.length} available batsmen. Match will end.`);
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
      // Reuse the shared `cleanMatchData` helper (defined earlier) to prepare the payload
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
  // Clear any pending/active player-change flows so the main dialog shows
  setChangePlayerType(null);
  setChangePlayerReason('');
  setIsPlayerChangeInProgress(false);
  setPendingBowlerChange('');
  setUserDismissedDialog(false);

  // Open player selection dialog for second innings (full selection)
  setIsPlayerSelectionDialogOpen(true);
      
    } catch (error) {
      console.error('Error starting second innings:', error);
    }
  };

  if (loading) return <Typography sx={{ fontSize: '2.5rem', textAlign: 'center', py: 6 }}>⏳</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!match) return <Typography>Match not found</Typography>;

  // Show innings transition screen when first innings is complete
  if (isFirstInningsComplete && currentInnings === 0) {
    const firstInning = match.innings[0];
    const firstInningBattingTeam = typeof firstInning?.battingTeam === 'object' && firstInning.battingTeam
      ? firstInning.battingTeam.name 
      : 'Team 1';

    const target = (firstInning?.totalRuns || 0) + 1;
    const requiredRunRate = match.overs && match.overs > 0 ? (target / match.overs) : null;

    const details = (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{firstInningBattingTeam} — {firstInning?.totalRuns || 0}/{firstInning?.wickets || 0}</Typography>
        <Typography variant="body2">Target: {target} runs in {match.overs} overs</Typography>
        {requiredRunRate !== null && (
          <Typography variant="body2" sx={{ color: '#d84315', fontWeight: 600 }}>Required RR: {Number(requiredRunRate).toFixed(2)} r/o</Typography>
        )}
      </Box>
    );

    return (
      <InningsTransition
        title={'🏏 First Innings Complete!'}
        primaryLabel={'🚀 Start Second Innings'}
        onPrimary={handleStartSecondInnings}
        onClose={() => navigate('/matches')}
        isMobile={isMobile}
      >
        {details}
      </InningsTransition>
    );
  }

  // Full-screen match completed view (used when match is auto-ended or completed)
  if (isMatchCompleted) {
    return (
      <InningsTransition
        title={'🏆 Match Completed!'}
        message={overCompletionMessage || (match && match.result) || 'Match completed.'}
        primaryLabel={'View Match Summary'}
        onPrimary={() => { if (matchId) navigate(`/matches/${matchId}/summary`); else navigate('/matches'); }}
        onClose={() => navigate('/matches')}
        isMobile={isMobile}
      />
    );
  }

  const currentInning = match.innings[currentInnings];
  // Calculate required run rate for second innings (runs per over)
  const requiredRunRate: number | null = (currentInnings === 1 && match.innings.length > 1) ? (() => {
    const target = (match.innings[0]?.totalRuns || 0) + 1;
    const currentScore = match.innings[1]?.totalRuns || 0;
    const runsRemaining = Math.max(0, target - currentScore);
    const totalBalls = (match.overs || 0) * 6;
    const ballsBowled = match.innings[1]?.balls || 0;
    const ballsRemaining = totalBalls - ballsBowled;
    if (ballsRemaining <= 0) return null;
    const oversRemaining = ballsRemaining / 6;
    const rrr = runsRemaining / oversRemaining;
    return Number.isFinite(rrr) ? rrr : null;
  })() : null;
  
  // If currentInning is undefined (during innings transition), show loading or return early
  if (!currentInning) {
    return (
      <Box sx={{ px: isMobile ? 1 : 3, mx: 'auto', textAlign: 'center', py: 6 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2', mb: 2 }}>
          ⏳ Loading innings data...
        </Typography>
      </Box>
    );
  }
  
  const battingTeamId = typeof currentInning?.battingTeam === 'string' 
    ? currentInning.battingTeam 
    : currentInning?.battingTeam?._id;
  const bowlingTeamId = typeof currentInning?.bowlingTeam === 'string'
    ? currentInning.bowlingTeam
    : currentInning?.bowlingTeam?._id;

  return (
    <Box 
      sx={{ 
        maxWidth: 'lg',
        px: isMobile ? 1 : 3, // 8px for mobile, 24px for desktop
        py: isMobile ? 1 : 3,
        mx: 'auto'
      }}
    >

      <Box 
        sx={{ 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          p: 0,
          mx: 0
        }}
      >
      <Paper 
        elevation={8}
        sx={{ 
          p: isMobile ? 1 : 3, // 8px for mobile, 24px for desktop
          borderRadius: isMobile ? 0 : 3,
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          margin: 0
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
          {currentInnings === 1 && showSecondInningsAlert && (
            <Alert 
              severity="success" 
              onClose={() => setShowSecondInningsAlert(false)}
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
  {!canEdit && showViewerModeAlert && (
        <Alert 
          severity="info"
          onClose={() => setShowViewerModeAlert(false)}
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
            👀 Guest User Mode
          </AlertTitle>
          You can score <strong>1-6 runs</strong> and record <strong>caught wickets</strong> for demo purposes. 
          The 0-runs button and other wicket types are disabled. For full scoring features, please contact an admin.
        </Alert>
      )}

      {/* Over Completion Alert */}
      {isOverCompleted && showOverCompletedAlert && (
        <Alert 
          severity="warning"
          onClose={() => setShowOverCompletedAlert(false)}
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
      {isWaitingForNewBatsman && showWicketAlert && (
        <Alert
          severity="info"
          onClose={() => setShowWicketAlert(false)}
          sx={{
            mb: 3,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
            border: '1px solid',
            borderColor: 'info.main',
            background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(21, 101, 192, 0.1) 100%)',
            '& .MuiAlert-message': { width: '100%' }
          }}
          action={
            <Button
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
          }
        >
          <Typography sx={{ mb: 2, fontWeight: 'bold' }}>
            Waiting for new batsman to be selected.
          </Typography>
        </Alert>
      )}
    
        {/* Mobile compact Need / Req RR summary */}
        {isMobile && currentInnings === 1 && match.innings[0] && (
          (() => {
            const target = (match.innings[0]?.totalRuns || 0) + 1;
            const currentScore = match.innings[1]?.totalRuns || 0;
            const runsRemaining = Math.max(0, target - currentScore);
            const totalBalls = (match.overs || 0) * 6;
            const ballsBowled = match.innings[1]?.balls || 0;
            const ballsRemaining = Math.max(0, totalBalls - ballsBowled);

            return (
              <Box sx={{ mb: 2, px: 1 }}>
                <Paper sx={{ p: 1, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    Need {runsRemaining} in {ballsRemaining} balls
                  </Typography>
                  {requiredRunRate !== null && (
                    <Typography variant="body2" sx={{ color: '#1976d2', mt: 0.5 }}>
                      Req RR: {requiredRunRate.toFixed(2)}
                    </Typography>
                  )}
                </Paper>
              </Box>
            );
          })()
        )}

        {/* Score Summary */}
  <Paper sx={{ p: isMobile ? 1 : 3, mb: isMobile ? 2 : 3, mx: isMobile ? 0 : 'auto' }} component="div">
        {/* Comprehensive Innings Display - Hidden on mobile */}
        {match.innings.length > 1 && !isMobile && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, textAlign: 'center', fontWeight: 'bold' }}>
              🏏 Match Scorecard
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              {/* First Innings */}
              <Paper sx={{ p: isMobile ? 1 : 2, backgroundColor: currentInnings === 0 ? '#e3f2fd' : '#f5f5f5' }}>
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
              <Paper sx={{ p: isMobile ? 1 : 2, backgroundColor: currentInnings === 1 ? '#e8f5e8' : '#f5f5f5' }}>
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
                  {currentInnings === 1 && requiredRunRate !== null && (
                    <span style={{ marginLeft: 12, fontWeight: 'bold', color: '#1976d2' }}>
                      • Req RR: {requiredRunRate !== null ? requiredRunRate.toFixed(2) : 'N/A'}
                    </span>
                  )}
                </Typography>
              </Paper>
            </Box>
          </Box>
        )}

        {/* Current Innings Detail - Hidden on mobile as it's shown in header */}
        {!isMobile && (
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 2, 
              textAlign: 'center',
              fontWeight: 'bold'
            }}
          >
            {currentInnings === 0 ? '1st Innings' : '2nd Innings'}
          </Typography>
        )}
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
        {/* Quick live stats: maiden & hat-trick */}
        <Box sx={{ mt: 2, mb: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {maidenOverInfo && maidenOverInfo.bowlerId && (
            <Chip
              label={`${maidenOverInfo.bowlerName || 'Bowler'}: Maiden (${maidenCounts[maidenOverInfo.bowlerId] || 1})`}
              color="success"
              size={isMobile ? 'small' : 'medium'}
            />
          )}
          {hatTrickInfo && hatTrickInfo.bowlerId && (
            <Chip
              label={`${hatTrickInfo.bowlerName || 'Bowler'}: HAT-TRICK!`}
              color="error"
              size={isMobile ? 'small' : 'medium'}
            />
          )}
        </Box>
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
          disabled={!canEdit || (isOverCompleted && !isWaitingForNewBatsman)}
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
          disabled={!canEdit || isOverCompleted || isWaitingForNewBatsman}
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
          value={players.find(p => p._id === (isPlayerChangeInProgress && changePlayerType === 'bowler' && pendingBowlerChange ? pendingBowlerChange : bowler)) || null}
          onChange={(event, newValue) => {
            if (newValue && newValue._id) {
              handleBowlerChange({ target: { value: newValue._id } } as SelectChangeEvent);
            }
          }}
          disabled={!canEdit || isWaitingForNewBatsman}
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

        {allowBowlerChange && showBowlerChangeAlert && (
          <Alert 
            severity="warning" 
            onClose={() => setShowBowlerChangeAlert(false)}
            sx={{ mt: 1 }}
          >
            <AlertTitle>Bowler Change Allowed</AlertTitle>
            Reason: {bowlerChangeReason}. You can now select a new bowler.
          </Alert>
        )}

        {/* Show rotation guidance when multiple bowlers used in previous over */}
        {isOverCompleted && bowlersUsedInCurrentOver.length > 1 && showBowlerRotationAlert && (
          <Alert 
            severity="info" 
            onClose={() => setShowBowlerRotationAlert(false)}
            sx={{ mt: 1 }}
          >
            <AlertTitle>Bowler Rotation Notice</AlertTitle>
            Multiple bowlers ({bowlersUsedInCurrentOver.length}) were used in the previous over. 
            Consider selecting a fresh bowler who hasn't bowled recently for the next over.
          </Alert>
        )}
      </Box>
      )}

      {/* Scoring Buttons (moved to OverControls) */}
      <Box sx={{ mb: isMobile ? 1.5 : 3 }}>
        <Typography 
          variant={isMobile ? "body1" : "h6"} 
          gutterBottom 
          sx={{ 
            color: '#2c3e50',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
            mb: isMobile ? 0.5 : 2,
            fontSize: isMobile ? '0.9rem' : undefined
          }}
        >
          🎯 Quick Scoring
        </Typography>
        <OverControls
          isMobile={isMobile}
          handleBallOutcome={handleBallOutcome}
          canEdit={!!canEdit}
          isOverCompleted={isOverCompleted}
          isOverInProgress={isOverInProgress}
          isWaitingForNewBatsman={isWaitingForNewBatsman}
          striker={striker}
          nonStriker={nonStriker}
          bowler={bowler}
          isMatchCompleted={isMatchCompleted}
          handleWicketClick={() => setIsWicketDialogOpen(true)}
          handleUndo={handleUndo}
          canUndo={canUndo}
        />
      </Box>

        {/* Undo panel showing recent actions and undo control */}
        <Box sx={{ mb: isMobile ? 1 : 2 }}>
          <UndoPanel undoHistory={undoHistory} canUndo={canUndo} onUndo={handleUndo} isMobile={isMobile} />
        </Box>

      {/* Extras Buttons */}
      <Box sx={{ mb: isMobile ? 1.5 : 3 }}>
        <Typography 
          variant={isMobile ? "body1" : "h6"} 
          gutterBottom 
          sx={{ 
            color: '#2c3e50',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
            mb: isMobile ? 0.5 : 2,
            fontSize: isMobile ? '0.9rem' : undefined
          }}
        >
          ⚡ Extras
        </Typography>
        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: isMobile ? 0.5 : 2
          }}
        >
          <Button 
            variant="outlined" 
            onClick={() => {
              setExtraType('wide');
              setExtraRuns(1);
              setIsExtraRunsDialogOpen(true);
            }}
            disabled={!canEdit || isOverCompleted || !isOverInProgress || isWaitingForNewBatsman || !striker || !nonStriker || !bowler || isMatchCompleted}
            sx={{
              minHeight: isMobile ? '32px' : '50px',
              borderRadius: isMobile ? '6px' : '10px',
              fontWeight: 'bold',
              fontSize: isMobile ? '0.75rem' : '1rem',
              color: '#FF9800',
              borderColor: '#FFB74D',
              background: 'rgba(255, 183, 77, 0.1)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(45deg, #FFB74D 30%, #FFA726 90%)',
                borderColor: '#FFA726',
                color: '#fff',
                transform: isMobile ? 'scale(0.98)' : 'translateY(-1px)',
                boxShadow: isMobile ? '0 1px 3px rgba(255, 183, 77, 0.3)' : '0 4px 8px rgba(255, 183, 77, 0.3)',
              },
              '&:disabled': {
                color: 'rgba(255, 152, 0, 0.5)',
                borderColor: 'rgba(255, 183, 77, 0.3)',
              }
            }}
          >
            Wide
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => {
              setExtraType('no-ball');
              setExtraRuns(1);
              setIsExtraRunsDialogOpen(true);
            }}
            disabled={!canEdit || isOverCompleted || !isOverInProgress || isWaitingForNewBatsman || !striker || !nonStriker || !bowler || isMatchCompleted}
            sx={{
              minHeight: isMobile ? '32px' : '50px',
              borderRadius: isMobile ? '6px' : '10px',
              fontWeight: 'bold',
              fontSize: isMobile ? '0.75rem' : '1rem',
              color: '#FF5722',
              borderColor: '#FF8A65',
              background: 'rgba(255, 138, 101, 0.1)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(45deg, #FF8A65 30%, #FF7043 90%)',
                borderColor: '#FF7043',
                color: '#fff',
                transform: isMobile ? 'scale(0.98)' : 'translateY(-1px)',
                boxShadow: isMobile ? '0 1px 3px rgba(255, 138, 101, 0.3)' : '0 4px 8px rgba(255, 138, 101, 0.3)',
              },
              '&:disabled': {
                color: 'rgba(255, 87, 34, 0.5)',
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
            disabled={!canEdit || isOverCompleted || !isOverInProgress || isWaitingForNewBatsman || !striker || !nonStriker || !bowler || isMatchCompleted}
            sx={{
              minHeight: isMobile ? '32px' : '50px',
              borderRadius: isMobile ? '6px' : '10px',
              fontWeight: 'bold',
              fontSize: isMobile ? '0.75rem' : '1rem',
              color: '#4CAF50',
              borderColor: '#81C784',
              background: 'rgba(129, 199, 132, 0.1)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(45deg, #81C784 30%, #66BB6A 90%)',
                borderColor: '#66BB6A',
                color: '#fff',
                transform: isMobile ? 'scale(0.98)' : 'translateY(-1px)',
                boxShadow: isMobile ? '0 1px 3px rgba(129, 199, 132, 0.3)' : '0 4px 8px rgba(129, 199, 132, 0.3)',
              },
              '&:disabled': {
                color: 'rgba(76, 175, 80, 0.5)',
                borderColor: 'rgba(129, 199, 132, 0.3)',
              }
            }}
          >
            Bye
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => {
              setExtraType('leg-bye');
              setExtraRuns(1);
              setIsExtraRunsDialogOpen(true);
            }}
            disabled={!canEdit || isOverCompleted || !isOverInProgress || isWaitingForNewBatsman || !striker || !nonStriker || !bowler || isMatchCompleted}
            sx={{
              minHeight: isMobile ? '32px' : '50px',
              borderRadius: isMobile ? '6px' : '10px',
              fontWeight: 'bold',
              fontSize: isMobile ? '0.75rem' : '1rem',
              color: '#9C27B0',
              borderColor: '#9575CD',
              background: 'rgba(149, 117, 205, 0.1)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(45deg, #9575CD 30%, #7E57C2 90%)',
                borderColor: '#7E57C2',
                color: '#fff',
                transform: isMobile ? 'scale(0.98)' : 'translateY(-1px)',
                boxShadow: isMobile ? '0 1px 3px rgba(149, 117, 205, 0.3)' : '0 4px 8px rgba(149, 117, 205, 0.3)',
              },
              '&:disabled': {
                color: 'rgba(156, 39, 176, 0.5)',
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
                  <TableCell sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <strong>{playerName}</strong>
                        {canEdit && !stat.isOut && (playerId === striker || playerId === nonStriker) && (
                          <Tooltip title="Change Batsman">
                            <IconButton
                              size="small"
                              onClick={() => handlePlayerChange(playerId === striker ? 'striker' : 'nonStriker')}
                              sx={{ 
                                minWidth: 20, 
                                minHeight: 20, 
                                padding: 0.25,
                                color: 'secondary.main',
                                '&:hover': { backgroundColor: 'secondary.light', color: 'secondary.dark' }
                              }}
                            >
                              <SwapHorizIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {playerId === striker && !stat.isOut && ' *'}
                      </Box>
                      <Typography 
                        variant="caption" 
                        color={stat.isOut ? "error" : "success"} 
                        sx={{ 
                          display: 'block',
                          fontSize: isMobile ? '0.65rem' : '0.7rem',
                          mt: 0.5
                        }}
                      >
                        {stat.isOut ? (stat.dismissalType || 'out') : 'not out'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: playerId === striker && !stat.isOut ? 'bold' : 'normal', fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                    {stat.runs}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                    {stat.balls}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                    {stat.fours}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                    {stat.sixes}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                    {strikeRate}
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
                statusDisplay = isMobile ? '' : 'Bowling*';
                statusColor = 'success.main';
              } else if (stat.lastBowledOver !== undefined) {
                statusDisplay = isMobile ? `O${stat.lastBowledOver + 1}` : `Last: Over ${stat.lastBowledOver + 1}`;
                statusColor = 'text.secondary';
              } else {
                statusDisplay = isMobile ? '✓' : 'Available';
                statusColor = 'primary.main';
              }

              return (
                <TableRow key={playerId} sx={{ backgroundColor: playerId === bowler ? 'action.selected' : 'inherit' }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {playerName}
                          {playerId === bowler && <Box component="span" sx={{ color: 'success.main', fontWeight: 'bold' }}>*</Box>}
                          {canEdit && playerId === bowler && (
                            <Tooltip title="Change Bowler">
                              <IconButton
                                size="small"
                                onClick={() => handlePlayerChange('bowler')}
                                sx={{ 
                                  minWidth: 20, 
                                  minHeight: 20, 
                                  padding: 0.25,
                                  color: 'secondary.main',
                                  '&:hover': { backgroundColor: 'secondary.light', color: 'secondary.dark' }
                                }}
                              >
                                <ChangeCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ color: statusColor, fontSize: '0.7rem', display: 'block', mt: 0.5 }}>
                          {statusDisplay}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: playerId === bowler ? 'bold' : 'normal' }}>{oversDisplay}</TableCell>
                  <TableCell align="right">{totalBalls}</TableCell>
                  <TableCell align="right">{stat.runs}</TableCell>
                  <TableCell align="right">{stat.wickets}</TableCell>
                  <TableCell align="right">{economy}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      </Box>

      {/* Extras Summary - Hidden on mobile */}
      {match && match.innings && match.innings.length > 0 && !isMobile && (
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
            background: 'white',
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
              {canEdit ? (
                <>
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
                    onClick={() => setWicketDetails({ type: 'run out' })}
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
                    onClick={() => setWicketDetails({ type: 'hit wicket' })}
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
                </>
              ) : (
                <>
                  <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                    <AlertTitle sx={{ fontWeight: 'bold' }}>🎯 Viewer Mode</AlertTitle>
                    As a guest user, you can only record <strong>caught</strong> wickets. For other dismissal types, please contact an admin.
                  </Alert>
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
                    disabled
                    fullWidth
                    sx={{
                      borderRadius: '10px',
                      fontWeight: 'bold',
                      background: 'linear-gradient(45deg, rgba(158, 158, 158, 0.1) 30%, rgba(158, 158, 158, 0.1) 90%)',
                      borderColor: '#9E9E9E',
                      color: '#9E9E9E',
                    }}
                  >
                    🔒 Other dismissal types (Admin only)
                  </Button>
                </>
              )}
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
              
              {wicketDetails.type === 'run out' && (
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
                  } else if (wicketDetails.type === 'run out' && wicketDetails.runOutBy) {
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
                  } else if (wicketDetails.type === 'hit wicket') {
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
                  (wicketDetails.type === 'run out' && !wicketDetails.runOutBy) ||
                  (wicketDetails.type === 'stumped' && !wicketDetails.stumpedBy)
                }
                fullWidth
              >
                Record Wicket
              </Button>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: isMobile ? 1 : 3 }}>
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
      
      {/* Match end dialog removed — full-screen match-completed view is used instead */}

      {/* Extra Runs Dialog for All Extras */}
      <Dialog 
        open={isExtraRunsDialogOpen} 
        onClose={() => setIsExtraRunsDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            background: 'white',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          }
        }}
      >
        <DialogTitle sx={{ 
          background: extraType === 'wide' 
            ? 'linear-gradient(45deg, #FFB74D 30%, #FFA726 90%)'
            : extraType === 'no-ball'
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
           extraType === 'no-ball' ? '🚫 No Ball + Runs' :
           extraType === 'bye' ? '🏃 Bye Runs' : '🦵 Leg Bye Runs'}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary' }}>
              {extraType === 'wide' ? 'How many additional runs were taken on the wide ball?' :
               extraType === 'no-ball' ? 'How many additional runs were taken on the no ball?' :
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
                               extraType === 'no-ball' ? '#FF8A65' :
                               extraType === 'bye' ? '#81C784' : '#9575CD',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: extraType === 'wide' ? '#FFB74D' : 
                               extraType === 'no-ball' ? '#FF8A65' :
                               extraType === 'bye' ? '#81C784' : '#9575CD',
                    borderWidth: '2px',
                  }
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: extraType === 'wide' ? '#FFB74D' : 
                        extraType === 'no-ball' ? '#FF8A65' :
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
              {extraType === 'wide' || extraType === 'no-ball' ? 
                `Total runs: ${extraType === 'wide' ? 1 : 1} (${extraType}) + ${extraRuns} (additional) = ${(extraType === 'wide' ? 1 : 1) + extraRuns}` :
                `${extraRuns} run${extraRuns !== 1 ? 's' : ''} will be added to team total`}
              <br />
              {(extraType === 'bye' || extraType === 'leg-bye') && extraRuns % 2 === 1 ? 
                '🔄 Striker and non-striker will swap ends' : 
                (extraType === 'bye' || extraType === 'leg-bye') ?
                '↔️ Batsmen will remain at their current ends' : ''}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: isMobile ? 1 : 3 }}>
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
                const totalRuns = (extraType === 'wide' || extraType === 'no-ball') ? 1 + extraRuns : extraRuns;
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
                : extraType === 'no-ball'
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
                   extraType === 'no-ball' ? 'No Ball' :
                   extraType === 'bye' ? 'Bye' : 'Leg Bye'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mid-Over Bowler Change Dialog (extracted to component) */}
      <BowlerChangeDialog
        open={isBowlerChangeDialogOpen}
        onClose={handleCancelBowlerChange}
        onAllow={handleAllowBowlerChange}
        isMobile={isMobile}
      />

      {/* Player Change Reason Dialog */}
      <Dialog
        open={isPlayerChangeDialogOpen}
        onClose={handlePlayerChangeCancel}
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
          background: changePlayerType === 'bowler'
            ? 'linear-gradient(45deg, #9C27B0 30%, #8E24AA 90%)'
            : 'linear-gradient(45deg, #2196F3 30%, #1976d2 90%)',
          color: '#fff',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
          borderRadius: '16px 16px 0 0'
        }}>
          🔄 Change {changePlayerType === 'striker' ? 'Striker' : 
                  changePlayerType === 'nonStriker' ? 'Non-Striker' : 'Bowler'}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body1" sx={{ mb: 3, fontWeight: 500, color: 'text.primary' }}>
              Please select the reason for changing the {changePlayerType === 'striker' ? 'striker' : 
                                                        changePlayerType === 'nonStriker' ? 'non-striker' : 'bowler'}:
            </Typography>
            <FormControl 
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: changePlayerType === 'bowler' ? '#9C27B0' : '#2196F3',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: changePlayerType === 'bowler' ? '#9C27B0' : '#2196F3',
                    borderWidth: '2px',
                  }
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: changePlayerType === 'bowler' ? '#9C27B0' : '#2196F3',
                }
              }}
            >
              <InputLabel>Reason</InputLabel>
              <Select
                value={changePlayerReason}
                onChange={(e) => setChangePlayerReason(e.target.value)}
                label="Reason"
              >
                <MenuItem value="injury">🤕 Injury</MenuItem>
                <MenuItem value="retire_hurt">💔 Retire Hurt</MenuItem>
                <MenuItem value="tactical">🎯 Tactical Change</MenuItem>
                <MenuItem value="other">📝 Other</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: isMobile ? 1 : 3 }}>
          <Button 
            onClick={handlePlayerChangeCancel}
            sx={{
              borderRadius: '8px',
              fontWeight: 'bold'
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handlePlayerChangeSubmit}
            disabled={!changePlayerReason}
            sx={{
              borderRadius: '8px',
              fontWeight: 'bold',
              background: changePlayerType === 'bowler'
                ? 'linear-gradient(45deg, #9C27B0 30%, #8E24AA 90%)'
                : 'linear-gradient(45deg, #2196F3 30%, #1976d2 90%)',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              },
              '&:disabled': {
                background: '#ccc',
              }
            }}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      <PlayerSelectionDialog
        open={isPlayerSelectionDialogOpen}
        onClose={() => { setIsPlayerSelectionDialogOpen(false); setUserDismissedDialog(true); }}
        onCancelDontShow={() => { setIsPlayerSelectionDialogOpen(false); setUserDismissedDialog(true); toast.showError("Auto-popup disabled. Use \"Select Players\" button when needed."); }}
        onCloseOnly={() => { setIsPlayerSelectionDialogOpen(false); }}
        onContinue={handleDialogContinue}
        getDialogContext={getDialogContext}
        players={players}
        match={match}
        currentInnings={currentInnings}
        striker={striker}
        nonStriker={nonStriker}
        bowler={bowler}
        changePlayerType={changePlayerType}
        isMobile={isMobile}
        showInsufficientBatsmenAlert={showInsufficientBatsmenAlert}
        setShowInsufficientBatsmenAlert={setShowInsufficientBatsmenAlert}
        getAvailableBatsmen={getAvailableBatsmen}
  areRequiredSelectionsComplete={() => !!areRequiredSelectionsComplete()}
        handleBatsmanChange={handleBatsmanChange}
        handleNonStrikerChange={handleNonStrikerChange}
        handleBowlerChange={handleBowlerChange}
        isOverCompleted={isOverCompleted}
        isWaitingForNewBatsman={isWaitingForNewBatsman}
      />
      </Paper>
    </Box>
    </Box>
  );
};

export default LiveScoring;