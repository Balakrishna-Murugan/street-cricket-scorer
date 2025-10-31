import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { BallOutcome } from '../types';

interface BallCommentaryProps {
  balls: BallOutcome[];
  currentOver?: number;
  bowlerName?: string;
  strikerName?: string;
  nonStrikerName?: string;
}

const BallCommentary: React.FC<BallCommentaryProps> = ({
  balls,
  currentOver = 0,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  // Helper to calculate over.ball for a given absolute ball index
  const getOverBall = (absoluteBallIndex: number) => {
    const over = Math.floor(absoluteBallIndex / 6);
    const ballNum = absoluteBallIndex % 6;
    return `${over}.${ballNum}`;
  };

  // Commentary now receives the last 6 balls in descending order (most recent first)
  // We need to know the absolute ball index for each ball in the match
  // Assume balls prop is already sorted oldest to newest (as in MatchCommentary)
  // So, the last ball in balls[] is the most recent

  // For the last 6 balls, get their absolute index in the match (handle <6 balls)
  const last6Balls = balls.length >= 6 ? balls.slice(-6) : balls;
  const firstBallIndex = balls.length - last6Balls.length;

  // Generate commentary for each ball, most recent first
  const generateSimpleCommentary = (ball: BallOutcome, absoluteBallIndex: number): string => {
    const overBall = getOverBall(absoluteBallIndex);
    if (ball.isWicket) {
      let wicketText = `Ball ${overBall}: WICKET! `;
      if (ball.dismissalType) {
        const dismissalType = ball.dismissalType.toLowerCase();
        switch (dismissalType) {
          case 'caught':
            wicketText += ball.fielder ? `Caught by ${ball.fielder}` : 'Caught out';
            break;
          case 'bowled':
            wicketText += 'Bowled!';
            break;
          case 'lbw':
            wicketText += 'LBW - Given out!';
            break;
          case 'run out':
            wicketText += ball.fielder ? `Run out by ${ball.fielder}` : 'Run out';
            break;
          case 'stumped':
            wicketText += ball.fielder ? `Stumped by ${ball.fielder}` : 'Stumped';
            break;
          case 'hit wicket':
            wicketText += 'Hit wicket';
            break;
          default:
            wicketText += ball.dismissalType;
        }
      } else {
        wicketText += 'Batsman is out';
      }
      return wicketText;
    } else if (ball.extras) {
      const extraType = ball.extras.type.toUpperCase();
      if (ball.extras.type === 'wide') {
        return `Ball ${overBall}: WIDE! +${ball.runs} extra${ball.runs > 1 ? 's' : ''}`;
      } else if (ball.extras.type === 'no-ball') {
        return `Ball ${overBall}: NO BALL! +${ball.runs} extra${ball.runs > 1 ? 's' : ''}`;
      } else if (ball.extras.type === 'bye') {
        return `Ball ${overBall}: BYE! ${ball.runs} run${ball.runs > 1 ? 's' : ''} taken`;
      } else if (ball.extras.type === 'leg-bye') {
        return `Ball ${overBall}: LEG BYE! ${ball.runs} run${ball.runs > 1 ? 's' : ''} taken`;
      } else {
        return `Ball ${overBall}: ${extraType} (+${ball.runs})`;
      }
    } else {
      if (ball.runs === 0) return `Ball ${overBall}: Dot ball - No runs scored`;
      if (ball.runs === 4) return `Ball ${overBall}: FOUR! Boundary hit`;
      if (ball.runs === 6) return `Ball ${overBall}: SIX! Maximum hit`;
      return `Ball ${overBall}: ${ball.runs} run${ball.runs > 1 ? 's' : ''} scored`;
    }
  };

  const getBallChipColor = (ball: BallOutcome): 'error' | 'warning' | 'success' | 'primary' | 'secondary' => {
    if (ball.isWicket) return 'error';
    if (ball.extras) return 'warning';
    if (ball.runs >= 4) return 'success';
    if (ball.runs > 0) return 'primary';
    return 'secondary';
  };

  const getBallChipLabel = (ball: BallOutcome): string => {
    if (ball.isWicket) {
      // Show dismissal type on chip for better clarity
      if (ball.dismissalType) {
        const dismissalShorts = {
          'caught': 'C',
          'bowled': 'B',
          'lbw': 'L',
          'run out': 'RO',
          'stumped': 'St',
          'hit wicket': 'HW'
        };
        return dismissalShorts[ball.dismissalType.toLowerCase() as keyof typeof dismissalShorts] || 'W';
      }
      return 'W';
    }
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

  if (!balls || balls.length === 0) {
    return (
      <Box sx={{ mt: 2, p: isMobile ? 1 : 2, bgcolor: 'rgba(255,255,255,0.7)', borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No balls bowled in this over yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom sx={{ color: '#666', mb: 2 }}>
        Current Over - Balls:
      </Typography>

      {/* Ball sequence chips */}
      <Stack direction="row" spacing={isMobile ? 0.5 : 1} sx={{ flexWrap: 'wrap', gap: isMobile ? 0.5 : 1, mb: 2 }}>
        {balls.map((ball, index) => (
          <Chip
            key={index}
            label={getBallChipLabel(ball)}
            color={getBallChipColor(ball)}
            size={isMobile ? "small" : "medium"}
            sx={{ 
              minWidth: isMobile ? '30px' : '35px',
              fontWeight: 'bold',
              fontSize: isMobile ? '0.875rem' : '1rem'
            }}
          />
        ))}
      </Stack>

      {/* Recent ball commentary, descending order (most recent first) */}
      <Box sx={{ 
        mt: 2, 
        p: isMobile ? 1 : 2, // Reduce mobile padding to 8px
        bgcolor: 'rgba(255,255,255,0.95)', 
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        border: '1px solid rgba(255,255,255,0.3)'
      }}>
        <Typography variant="caption" sx={{ 
          color: '#020e43', 
          fontWeight: 'bold', 
          mb: 1.5, 
          display: 'block',
          fontSize: isMobile ? '0.75rem' : '0.85rem',
          letterSpacing: '0.5px'
        }}>
          📝 Recent Balls:
        </Typography>
        {[...last6Balls].map((ball, i) => {
          // Descending: most recent first
          const absoluteBallIndex = firstBallIndex + (last6Balls.length - 1 - i);
          return (
            <Typography 
              key={i} 
              variant="body2" 
              sx={{ 
                color: '#1a1a2e', 
                mb: 1,
                fontSize: isMobile ? '0.875rem' : '0.95rem',
                fontWeight: 500,
                lineHeight: 1.6,
                padding: isMobile ? '4px 8px' : '6px 12px',
                bgcolor: i === 0 ? 'rgba(2, 14, 67, 0.05)' : 'transparent',
                borderRadius: 1,
                borderLeft: '3px solid',
                borderLeftColor: ball.isWicket ? '#d32f2f' : ball.runs >= 4 ? '#4caf50' : 'rgba(2, 14, 67, 0.2)'
              }}
            >
              {generateSimpleCommentary(ball, absoluteBallIndex)}
            </Typography>
          );
        })}
      </Box>
    </Box>
  );
};

export default BallCommentary;