import React from 'react';
import { Box, Typography, Stack, Chip, useTheme, useMediaQuery } from '@mui/material';
import { Player, BallOutcome } from '../types';

interface MatchDetailsProps {
  totalRuns: number;
  wickets: number;
  overs: number;
  totalBalls?: number;
  currentOverBalls: BallOutcome[];
  striker: string;
  nonStriker: string;
  bowler: string;
  players: Player[];
  strikerStats: { runs: number; balls: number };
  nonStrikerStats: { runs: number; balls: number };
  bowlerStats: { overs: number; runs: number; wickets: number; balls: number };
}

const MatchDetails: React.FC<MatchDetailsProps> = ({
  totalRuns,
  wickets,
  overs,
  totalBalls,
  currentOverBalls,
  striker,
  nonStriker,
  bowler,
  players,
  strikerStats,
  nonStrikerStats,
  bowlerStats,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const formatOvers = (totalBalls: number) => {
    const completeOvers = Math.floor(totalBalls / 6);
    const remainingBalls = totalBalls % 6;
    return remainingBalls > 0 ? `${completeOvers}.${remainingBalls}` : completeOvers.toString();
  };

  const formatOversFromDecimal = (overs: number) => {
    const completeOvers = Math.floor(overs);
    const fractionalPart = overs - completeOvers;
    const balls = Math.round(fractionalPart * 10);
    return balls > 0 ? `${completeOvers}.${balls}` : completeOvers.toString();
  };

  const getBallChipColor = (ball: BallOutcome): 'error' | 'warning' | 'success' | 'primary' | 'secondary' => {
    if (ball.isWicket) return 'error';
    if (ball.extras) return 'warning';
    if (ball.runs >= 4) return 'success';
    if (ball.runs > 0) return 'primary';
    return 'secondary';
  };

  const getBallChipLabel = (ball: BallOutcome): string => {
    if (ball.isWicket) return 'W';
    if (ball.extras) {
      const shortForm = {
        'wide': 'Wd',
        'no-ball': 'Nb',
        'bye': 'B',
        'leg-bye': 'Lb'
      }[ball.extras.type] || ball.extras.type;
      return `${shortForm}${ball.extras.runs}`;
    }
    return ball.runs.toString();
  };

  return (
    <Box>
      {/* Mobile-optimized layout */}
      {isMobile ? (
        <Box>
          {/* Compact Score Section */}
          <Box sx={{ textAlign: 'center', mb: 1 }}>
            <Typography 
              variant="h4" 
              sx={{ fontWeight: 'bold', color: '#1976d2', mb: 0 }}
            >
              {totalRuns}/{wickets}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ color: '#666', mt: -0.5 }}
            >
              ({totalBalls !== undefined ? formatOvers(totalBalls) : formatOversFromDecimal(overs)} ov)
            </Typography>
          </Box>

          {/* Compact Ball Chips */}
          {currentOverBalls.length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Stack 
                direction="row" 
                spacing={0.5} 
                sx={{ 
                  flexWrap: 'wrap', 
                  gap: 0.5,
                  justifyContent: 'center'
                }}
              >
                {/* Only show current over balls (max 6) */}
                {currentOverBalls.slice(-6).map((ball, index) => (
                  <Chip
                    key={index}
                    label={getBallChipLabel(ball)}
                    color={getBallChipColor(ball)}
                    size="small"
                    sx={{ 
                      minWidth: '24px',
                      height: '24px',
                      fontWeight: 'bold',
                      fontSize: '0.7rem',
                      '& .MuiChip-label': {
                        px: 0.5
                      }
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Ultra-compact Player Info */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ flex: 1, textAlign: 'left' }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
                {(players.find(p => p._id === striker)?.name || 'Striker').split(' ')[0]} * {strikerStats.runs}({strikerStats.balls})
              </Typography>
            </Box>
            <Box sx={{ flex: 1, textAlign: 'right' }}>
              <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                {(players.find(p => p._id === nonStriker)?.name || 'Non-striker').split(' ')[0]} {nonStrikerStats.runs}({nonStrikerStats.balls})
              </Typography>
            </Box>
          </Box>

          {/* Compact Bowler Info */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
              {(players.find(p => p._id === bowler)?.name || 'Bowler').split(' ')[0]}: {formatOvers(bowlerStats.balls || 0)}-{bowlerStats.wickets}-{bowlerStats.runs}
            </Typography>
          </Box>
        </Box>
      ) : (
        /* Desktop layout remains the same */
        <Box>
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start', 
              mb: 2,
              gap: 2 
            }}
          >
            {/* Score Section */}
            <Box>
              <Typography 
                variant="h4" 
                sx={{ fontWeight: 'bold', color: '#1976d2' }}
              >
                {totalRuns}/{wickets}
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ color: '#666' }}
              >
                Overs: {totalBalls !== undefined ? formatOvers(totalBalls) : formatOversFromDecimal(overs)}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            {currentOverBalls.length > 0 ? (
              <Stack 
                direction="row" 
                spacing={1} 
                sx={{ 
                  flexWrap: 'wrap', 
                  gap: 1
                }}
              >
                {/* Only show current over balls (max 6) */}
                {currentOverBalls.slice(-6).map((ball, index) => (
                  <Chip
                    key={index}
                    label={getBallChipLabel(ball)}
                    color={getBallChipColor(ball)}
                    size="small"
                    sx={{ 
                      minWidth: '28px',
                      height: '28px',
                      fontWeight: 'bold',
                      fontSize: '0.7rem',
                      '& .MuiChip-label': {
                        px: 0.5
                      }
                    }}
                  />
                ))}
              </Stack>
            ) : (
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#666', 
                  fontStyle: 'italic'
                }}
              >
                No balls bowled yet
              </Typography>
            )}
          </Box>

          <Box 
            sx={{ 
              display: 'flex', 
              gap: 4, 
              mb: 2 
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                {players.find(p => p._id === striker)?.name || 'Select Striker'} *
              </Typography>
              <Typography variant="body2">
                {strikerStats.runs}({strikerStats.balls})
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">
                {players.find(p => p._id === nonStriker)?.name || 'Select Non-striker'}
              </Typography>
              <Typography variant="body2">
                {nonStrikerStats.runs}({nonStrikerStats.balls})
              </Typography>
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Bowler: {players.find(p => p._id === bowler)?.name || 'Select Bowler'}
            </Typography>
            <Typography variant="body2">
              {formatOvers(bowlerStats.balls || 0)}-{bowlerStats.wickets}-{bowlerStats.runs}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default MatchDetails;