import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Match, BallOutcome } from '../types';
import BallCommentary from './BallCommentary';

interface MatchCommentaryProps {
  match: Match;
}

const MatchCommentary: React.FC<MatchCommentaryProps> = ({ match }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Only show live commentary for matches that are currently in progress
  if (!match || match.status !== 'in-progress') {
    return (
      <Paper sx={{ 
        p: isMobile ? 2 : 3, 
        borderRadius: isMobile ? 2 : 3, 
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' 
      }}>
        <Typography 
          variant={isMobile ? 'subtitle1' : 'h6'} 
          gutterBottom 
          sx={{ color: '#2c3e50', fontWeight: 'bold' }}
        >
          🏏 Live Commentary
        </Typography>
        <Typography 
          variant={isMobile ? 'body2' : 'body1'} 
          color="text.secondary"
        >
          {match?.status === 'upcoming' && 'Match has not started yet. Live commentary will appear once the match begins.'}
          {match?.status === 'completed' && 'Match completed. Live commentary is only available during active matches.'}
          {match?.status === 'abandoned' && 'Match was abandoned. No live commentary available.'}
          {!match && 'No match data available for commentary.'}
        </Typography>
      </Paper>
    );
  }

  if (!match.innings || match.innings.length === 0) {
    return (
      <Paper sx={{ 
        p: isMobile ? 2 : 3, 
        borderRadius: isMobile ? 2 : 3, 
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' 
      }}>
        <Typography 
          variant={isMobile ? 'subtitle1' : 'h6'} 
          gutterBottom 
          sx={{ color: '#2c3e50', fontWeight: 'bold' }}
        >
          🏏 Live Commentary
        </Typography>
        <Typography 
          variant={isMobile ? 'body2' : 'body1'} 
          color="text.secondary"
        >
          Match is in progress but no innings data available yet.
        </Typography>
      </Paper>
    );
  }

  // Get the current active innings based on match.currentInnings
  const currentInningsIndex = match.currentInnings || 0;
  const currentInnings = match.innings[currentInningsIndex];

  // If no current innings exists, show message
  if (!currentInnings) {
    return (
      <Paper sx={{ 
        p: isMobile ? 2 : 3, 
        borderRadius: isMobile ? 2 : 3, 
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' 
      }}>
        <Typography 
          variant={isMobile ? 'subtitle1' : 'h6'} 
          gutterBottom 
          sx={{ color: '#2c3e50', fontWeight: 'bold' }}
        >
          🏏 Live Commentary
        </Typography>
        <Typography 
          variant={isMobile ? 'body2' : 'body1'} 
          color="text.secondary"
        >
          No active innings data available.
        </Typography>
      </Paper>
    );
  }

  const inningsNumber = currentInningsIndex + 1;
  const battingTeamName = typeof currentInnings.battingTeam === 'object' 
    ? currentInnings.battingTeam.name 
    : `Team ${inningsNumber}`;
  
  // Get ball outcomes from recent balls (last 12 balls for live commentary)
  const allBalls: BallOutcome[] = [];
  
  // DEBUG: Check ball data availability
  console.log(`Commentary: ${currentInnings.balls} balls, recentBalls=${currentInnings.recentBalls?.length || 0}, currentOverBalls=${currentInnings.currentOverBalls?.length || 0}`);
  
  // Use recent balls if available (last 12 balls across overs)
  if (currentInnings.recentBalls && Array.isArray(currentInnings.recentBalls) && currentInnings.recentBalls.length > 0) {
    // Sort balls by sequence number and timestamp to ensure proper order
    const sortedBalls = [...currentInnings.recentBalls].sort((a, b) => {
      if (a.sequenceNumber && b.sequenceNumber) {
        return a.sequenceNumber - b.sequenceNumber;
      }
      if (a.timestamp && b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return 0; // Keep original order if no sorting criteria
    });
    allBalls.push(...sortedBalls);

  } 
  // Fallback to current over balls if recentBalls not available
  else if (currentInnings.currentOverBalls && Array.isArray(currentInnings.currentOverBalls) && currentInnings.currentOverBalls.length > 0) {
    // Sort current over balls too for consistency
    const sortedCurrentBalls = [...currentInnings.currentOverBalls].sort((a, b) => {
      if (a.sequenceNumber && b.sequenceNumber) {
        return a.sequenceNumber - b.sequenceNumber;
      }
      if (a.timestamp && b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return 0;
    });
    allBalls.push(...sortedCurrentBalls);
  }

  return (
    <Paper sx={{ 
      p: isMobile ? 2 : 3, 
      borderRadius: isMobile ? 2 : 3, 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' 
    }}>
      <Typography 
        variant={isMobile ? 'subtitle1' : 'h6'} 
        gutterBottom 
        sx={{ 
          color: '#2c3e50', 
          fontWeight: 'bold', 
          mb: isMobile ? 2 : 3,
          fontSize: isMobile ? '1rem' : '1.25rem'
        }}
      >
        🏏 Live Commentary
      </Typography>

      <Box sx={{ mb: isMobile ? 2 : 3 }}>
        {/* Innings Header */}
        <Typography 
          variant={isMobile ? 'subtitle1' : 'h6'} 
          sx={{ 
            fontWeight: 'bold', 
            color: currentInningsIndex === 0 ? '#1976d2' : '#9c27b0',
            mb: isMobile ? 1.5 : 2,
            fontSize: isMobile ? '0.95rem' : '1.25rem'
          }}
        >
          {battingTeamName} - {inningsNumber === 1 ? '1st' : '2nd'} Innings
          <Chip 
            label="Currently Playing" 
            color="success" 
            size={isMobile ? 'small' : 'small'} 
            sx={{ 
              ml: isMobile ? 1 : 2, 
              fontWeight: 'bold',
              fontSize: isMobile ? '0.65rem' : '0.75rem'
            }}
          />
        </Typography>
        
        {/* Score Summary */}
        <Stack 
          direction="row" 
          spacing={isMobile ? 1 : 2} 
          sx={{ 
            mb: isMobile ? 1.5 : 2, 
            flexWrap: 'wrap',
            gap: isMobile ? 1 : 2
          }}
        >
          <Chip 
            label={`${currentInnings.totalRuns}/${currentInnings.wickets}`}
            color="primary"
            size={isMobile ? 'small' : 'medium'}
            sx={{ 
              fontWeight: 'bold',
              fontSize: isMobile ? '0.75rem' : '0.875rem'
            }}
          />
          <Chip 
            label={`${Math.floor(currentInnings.balls / 6)}.${currentInnings.balls % 6} overs`}
            variant="outlined"
            size={isMobile ? 'small' : 'medium'}
            sx={{
              fontSize: isMobile ? '0.75rem' : '0.875rem'
            }}
          />
          {currentInnings.runRate && (
            <Chip 
              label={`RR: ${currentInnings.runRate.toFixed(2)}`}
              variant="outlined"
              color="secondary"
              size={isMobile ? 'small' : 'medium'}
              sx={{
                fontSize: isMobile ? '0.75rem' : '0.875rem'
              }}
            />
          )}
        </Stack>
        
        {/* Ball Commentary */}
        {allBalls.length > 0 ? (
          <BallCommentary
            balls={allBalls}
            currentOver={Math.floor(currentInnings.balls / 6) + 1}
            bowlerName=""
            strikerName=""
            nonStrikerName=""
          />
        ) : (
          <Box>
            {/* Debug information for troubleshooting */}
            <Typography variant="body2" sx={{ 
              fontStyle: 'italic', 
              color: '#666',
              textAlign: 'center',
              py: 3,
              bgcolor: 'rgba(255,255,255,0.7)',
              borderRadius: 2,
              mb: 2
            }}>
              {currentInnings.balls > 0 
                ? `${currentInnings.balls} balls bowled - Ball-by-ball commentary will appear when scoring new balls in Live Scoring`
                : 'No balls bowled yet in this innings'
              }
            </Typography>
            
            {/* Show some debug info if balls have been bowled but no ball data available */}
            {currentInnings.balls > 0 && process.env.NODE_ENV === 'development' && (
              <Typography variant="caption" sx={{ 
                display: 'block',
                textAlign: 'center',
                color: '#999',
                fontFamily: 'monospace',
                mb: 1
              }}>
                Debug: recentBalls={currentInnings.recentBalls?.length || 0}, currentOverBalls={currentInnings.currentOverBalls?.length || 0}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Match Result */}
      {match.result && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.dark', textAlign: 'center' }}>
            🏆 {match.result}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default MatchCommentary;