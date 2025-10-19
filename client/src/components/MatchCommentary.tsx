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
        borderRadius: 2, 
        background: 'linear-gradient(135deg, #020e43 0%, #764ba2 100%)',
        boxShadow: '0 8px 32px rgba(2, 14, 67, 0.3)'
      }}>
        <Typography 
          variant={isMobile ? 'subtitle1' : 'h6'} 
          gutterBottom 
          sx={{ 
            color: 'white', 
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          🏏 Live Commentary
        </Typography>
        <Typography 
          variant={isMobile ? 'body2' : 'body1'} 
          sx={{ color: 'rgba(255, 255, 255, 0.9)' }}
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
        borderRadius: 2, 
        background: 'linear-gradient(135deg, #020e43 0%, #764ba2 100%)',
        boxShadow: '0 8px 32px rgba(2, 14, 67, 0.3)'
      }}>
        <Typography 
          variant={isMobile ? 'subtitle1' : 'h6'} 
          gutterBottom 
          sx={{ 
            color: 'white', 
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          🏏 Live Commentary
        </Typography>
        <Typography 
          variant={isMobile ? 'body2' : 'body1'} 
          sx={{ color: 'rgba(255, 255, 255, 0.9)' }}
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
        borderRadius: 2, 
        background: 'linear-gradient(135deg, #020e43 0%, #764ba2 100%)',
        boxShadow: '0 8px 32px rgba(2, 14, 67, 0.3)'
      }}>
        <Typography 
          variant={isMobile ? 'subtitle1' : 'h6'} 
          gutterBottom 
          sx={{ 
            color: 'white', 
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          🏏 Live Commentary
        </Typography>
        <Typography 
          variant={isMobile ? 'body2' : 'body1'} 
          sx={{ color: 'rgba(255, 255, 255, 0.9)' }}
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
      borderRadius: 2, 
      background: 'linear-gradient(135deg, #020e43 0%, #764ba2 100%)',
      boxShadow: '0 8px 32px rgba(2, 14, 67, 0.3)'
    }}>
      <Typography 
        variant={isMobile ? 'subtitle1' : 'h6'} 
        gutterBottom 
        sx={{ 
          color: 'white', 
          fontWeight: 'bold', 
          mb: isMobile ? 2 : 3,
          fontSize: isMobile ? '1rem' : '1.25rem',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
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
            color: 'white',
            mb: isMobile ? 1.5 : 2,
            fontSize: isMobile ? '0.95rem' : '1.25rem',
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
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
              fontSize: isMobile ? '0.65rem' : '0.75rem',
              backgroundColor: '#4caf50',
              color: 'white',
              boxShadow: '0 2px 8px rgba(76, 175, 80, 0.4)',
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.7 }
              }
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
            sx={{ 
              fontWeight: 'bold',
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              backgroundColor: 'white',
              color: '#020e43',
              boxShadow: '0 2px 8px rgba(255,255,255,0.3)'
            }}
          />
          <Chip 
            label={`${Math.floor(currentInnings.balls / 6)}${currentInnings.balls % 6 > 0 ? `.${currentInnings.balls % 6}` : ''} overs`}
            sx={{
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}
          />
          {currentInnings.runRate && (
            <Chip 
              label={`RR: ${currentInnings.runRate.toFixed(2)}`}
              sx={{
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}
            />
          )}
        </Stack>
        
        {/* Fall of Wickets */}
        {(() => {
          const fallOfWickets = currentInnings.battingStats
            .filter(stat => stat.isOut)
            .map((stat, index) => {
              const playerName = typeof stat.player === 'object' ? 
                stat.player.name : 
                'Player';
              
              // Calculate runs at this wicket
              let runsAtWicket = 0;
              for (let i = 0; i <= currentInnings.battingStats.indexOf(stat); i++) {
                runsAtWicket += currentInnings.battingStats[i].runs || 0;
              }
              
              return {
                wicketNumber: index + 1,
                playerName,
                runs: stat.runs,
                totalRuns: runsAtWicket,
                dismissalType: stat.dismissalType || 'out'
              };
            });

          if (fallOfWickets.length > 0) {
            return (
              <Box sx={{ 
                mb: 2, 
                p: 2, 
                bgcolor: 'rgba(255,255,255,0.95)', 
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                border: '1px solid rgba(255,255,255,0.3)'
              }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    color: '#020e43', 
                    fontWeight: 'bold', 
                    mb: 1.5, 
                    fontSize: isMobile ? '0.85rem' : '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  📉 Fall of Wickets
                </Typography>
                <Stack spacing={1}>
                  {fallOfWickets.map((wicket: { wicketNumber: number; playerName: string; runs: number; totalRuns: number; dismissalType: string }) => (
                    <Box
                      key={wicket.wicketNumber}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1,
                        bgcolor: wicket.wicketNumber % 2 === 0 ? 'rgba(240, 240, 240, 0.5)' : 'transparent',
                        borderRadius: 1,
                        borderLeft: '3px solid #d32f2f',
                      }}
                    >
                      <Chip
                        label={`${wicket.totalRuns}/${wicket.wicketNumber}`}
                        size="small"
                        sx={{
                          bgcolor: '#d32f2f',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: isMobile ? '0.7rem' : '0.75rem',
                          minWidth: '50px'
                        }}
                      />
                      <Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 600,
                            fontSize: isMobile ? '0.75rem' : '0.85rem',
                            color: '#1a1a2e'
                          }}
                        >
                          {wicket.playerName}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: '#666',
                            fontSize: isMobile ? '0.65rem' : '0.7rem'
                          }}
                        >
                          {wicket.runs} runs • {wicket.dismissalType}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
            );
          }
          return null;
        })()}
        
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
              color: 'rgba(255, 255, 255, 0.9)',
              textAlign: 'center',
              py: 3,
              bgcolor: 'rgba(255,255,255,0.1)',
              borderRadius: 2,
              mb: 2,
              border: '1px solid rgba(255, 255, 255, 0.2)'
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
                color: 'rgba(255, 255, 255, 0.6)',
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
        <Box sx={{ 
          mt: 3, 
          p: 2, 
          background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(139, 195, 74, 0.2) 100%)', 
          borderRadius: 2,
          border: '2px solid rgba(76, 175, 80, 0.5)',
          boxShadow: '0 4px 16px rgba(76, 175, 80, 0.3)'
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 'bold', 
            color: 'white', 
            textAlign: 'center',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }}>
            🏆 {match.result}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default MatchCommentary;