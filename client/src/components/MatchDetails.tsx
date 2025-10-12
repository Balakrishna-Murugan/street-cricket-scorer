import React from 'react';
import { Box, Typography, Button, Stack, Chip } from '@mui/material';
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
  // Over management props
  isAdmin?: boolean;
  isOverInProgress?: boolean;
  isOverCompleted?: boolean;
  overCompletionMessage?: string;
  onStartNewOver?: () => void;
  onEndOver?: () => void;
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
  isAdmin = false,
  isOverInProgress = false,
  isOverCompleted = false,
  overCompletionMessage = '',
  onStartNewOver,
  onEndOver,
}) => {
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        {/* Left side - Score */}
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
            {totalRuns}/{wickets}
          </Typography>
          <Typography variant="h6" sx={{ color: '#666' }}>
            Overs: {totalBalls !== undefined ? formatOvers(totalBalls) : formatOversFromDecimal(overs)}
          </Typography>
        </Box>

        {/* Right side - Over Management */}
        {isAdmin && (
          <Box sx={{ 
            p: 2,
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef',
            minWidth: '200px'
          }}>
            <Typography 
              variant="subtitle2" 
              gutterBottom
              sx={{ 
                color: '#2c3e50',
                fontWeight: 'bold',
                mb: 1
              }}
            >
              🏏 Over Control
            </Typography>
            <Stack direction="column" spacing={1}>
              <Button
                variant="contained"
                size="small"
                onClick={onStartNewOver}
                disabled={isOverInProgress || isOverCompleted}
                sx={{
                  fontSize: '0.75rem',
                  py: 0.5,
                  background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
                  '&:disabled': {
                    background: '#ccc',
                  }
                }}
              >
                Start New Over
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={onEndOver}
                disabled={!isOverInProgress || isOverCompleted}
                sx={{
                  fontSize: '0.75rem',
                  py: 0.5,
                  color: '#FF8A65',
                  borderColor: '#FF8A65',
                }}
              >
                End Over
              </Button>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: isOverCompleted ? '#f57c00' : isOverInProgress ? '#4caf50' : '#666',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}
              >
                {isOverCompleted ? '✅ Over Complete' :
                 isOverInProgress ? '🏏 In Progress' : 
                 '⏸️ Not Started'}
              </Typography>
            </Stack>
          </Box>
        )}
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          This Over:
        </Typography>
        {currentOverBalls.length > 0 ? (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {currentOverBalls.map((ball, index) => (
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
          <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
            No balls bowled yet
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 4, mb: 2 }}>
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
  );
};

export default MatchDetails;