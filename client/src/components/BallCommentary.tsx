import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
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
  const generateSimpleCommentary = (ball: BallOutcome, ballIndex: number): string => {
    const ballNumber = ballIndex + 1;
    
    if (ball.isWicket) {
      let wicketText = `Ball ${ballNumber}: WICKET! `;
      
      // Add detailed dismissal information
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
        return `Ball ${ballNumber}: WIDE! +${ball.runs} extra${ball.runs > 1 ? 's' : ''}`;
      } else if (ball.extras.type === 'no-ball') {
        return `Ball ${ballNumber}: NO BALL! +${ball.runs} extra${ball.runs > 1 ? 's' : ''}`;
      } else if (ball.extras.type === 'bye') {
        return `Ball ${ballNumber}: BYE! ${ball.runs} run${ball.runs > 1 ? 's' : ''} taken`;
      } else if (ball.extras.type === 'leg-bye') {
        return `Ball ${ballNumber}: LEG BYE! ${ball.runs} run${ball.runs > 1 ? 's' : ''} taken`;
      } else {
        return `Ball ${ballNumber}: ${extraType} (+${ball.runs})`;
      }
    } else {
      if (ball.runs === 0) return `Ball ${ballNumber}: Dot ball - No runs scored`;
      if (ball.runs === 4) return `Ball ${ballNumber}: FOUR! Boundary hit`;
      if (ball.runs === 6) return `Ball ${ballNumber}: SIX! Maximum hit`;
      return `Ball ${ballNumber}: ${ball.runs} run${ball.runs > 1 ? 's' : ''} scored`;
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
      <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,255,255,0.7)', borderRadius: 2, textAlign: 'center' }}>
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
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {balls.map((ball, index) => (
          <Chip
            key={index}
            label={getBallChipLabel(ball)}
            color={getBallChipColor(ball)}
            size="medium"
            sx={{ 
              minWidth: '35px',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}
          />
        ))}
      </Stack>

      {/* Recent ball commentary */}
      <Box sx={{ 
        mt: 2, 
        p: 2, 
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
          fontSize: '0.85rem',
          letterSpacing: '0.5px'
        }}>
          📝 Recent Balls:
        </Typography>
        {balls.slice(-3).map((ball, index) => (
          <Typography 
            key={index} 
            variant="body2" 
            sx={{ 
              color: '#1a1a2e', 
              mb: 1,
              fontSize: '0.95rem',
              fontWeight: 500,
              lineHeight: 1.6,
              padding: '6px 12px',
              bgcolor: index === balls.slice(-3).length - 1 ? 'rgba(2, 14, 67, 0.05)' : 'transparent',
              borderRadius: 1,
              borderLeft: '3px solid',
              borderLeftColor: ball.isWicket ? '#d32f2f' : ball.runs >= 4 ? '#4caf50' : 'rgba(2, 14, 67, 0.2)'
            }}
          >
            {generateSimpleCommentary(ball, balls.length - 3 + index)}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

export default BallCommentary;