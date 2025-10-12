import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider,
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
  bowlerName,
  strikerName,
  nonStrikerName,
}) => {
  const generateCommentary = (ball: BallOutcome, ballIndex: number): string => {
    const ballNumber = `${currentOver}.${ballIndex + 1}`;
    let commentary = `Ball ${ballNumber}: `;
    
    if (ball.isWicket) {
      commentary += `🏏 WICKET! ${ball.dismissalType?.toUpperCase()}`;
      if (ball.fielder) {
        commentary += ` (fielded by ${ball.fielder})`;
      }
      if (ball.runs > 0) {
        commentary += ` + ${ball.runs} runs`;
      }
    } else if (ball.extras) {
      const extraType = ball.extras.type.replace(/([A-Z])/g, ' $1').toLowerCase();
      commentary += `${extraType.toUpperCase()} + ${ball.extras.runs} runs`;
      if (ball.runs > ball.extras.runs) {
        commentary += ` + ${ball.runs - ball.extras.runs} off the bat`;
      }
    } else {
      if (ball.runs === 0) {
        commentary += `Dot ball`;
      } else if (ball.runs === 4) {
        commentary += `🎯 FOUR! ${ball.runs} runs`;
      } else if (ball.runs === 6) {
        commentary += `💥 SIX! Maximum!`;
      } else {
        commentary += `${ball.runs} run${ball.runs > 1 ? 's' : ''}`;
      }
    }
    
    return commentary;
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

  if (!balls || balls.length === 0) {
    return (
      <Paper sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#2c3e50', fontWeight: 'bold' }}>
          📝 Ball-by-Ball Commentary
        </Typography>
        <Typography color="text.secondary">
          No balls bowled yet. Start the over to see ball-by-ball commentary.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      <Typography variant="h6" gutterBottom sx={{ color: '#2c3e50', fontWeight: 'bold', mb: 3 }}>
        📝 Ball-by-Ball Commentary
      </Typography>
      
      {bowlerName && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Over {currentOver}: {bowlerName} to {strikerName} ({nonStrikerName} at non-striker's end)
          </Typography>
          <Divider sx={{ my: 1 }} />
        </Box>
      )}

      <Stack spacing={2}>
        {balls.map((ball, index) => (
          <Card key={index} sx={{ 
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: ball.isWicket ? '2px solid #f44336' : ball.extras ? '1px solid #ff9800' : '1px solid #e0e0e0'
          }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body1" sx={{ flex: 1 }}>
                  {generateCommentary(ball, index)}
                </Typography>
                <Chip
                  label={getBallChipLabel(ball)}
                  color={getBallChipColor(ball)}
                  size="small"
                  sx={{ 
                    minWidth: '40px',
                    fontWeight: 'bold',
                    fontSize: '0.875rem'
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {balls.length > 0 && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(25, 118, 210, 0.1)', borderRadius: 2 }}>
          <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
            📊 This Over:
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {balls.map((ball, index) => (
              <Chip
                key={index}
                label={getBallChipLabel(ball)}
                color={getBallChipColor(ball)}
                size="small"
                sx={{ 
                  minWidth: '32px',
                  height: '32px',
                  fontWeight: 'bold',
                  fontSize: '0.75rem',
                  '& .MuiChip-label': {
                    px: 1
                  }
                }}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Paper>
  );
};

export default BallCommentary;