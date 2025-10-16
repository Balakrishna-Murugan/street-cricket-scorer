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
  bowlerName,
  strikerName,
  nonStrikerName,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const generateCommentary = (ball: BallOutcome, ballIndex: number): string => {
    // Calculate proper over and ball number
    // For extras like wide/no-ball, ball number doesn't advance
    const legalBallsCount = balls.slice(0, ballIndex + 1).filter(b => 
      !b.extras || (b.extras.type !== 'wide' && b.extras.type !== 'no-ball')
    ).length;
    
    const overNumber = Math.floor((legalBallsCount - 1) / 6) + 1;
    const ballInOver = ((legalBallsCount - 1) % 6) + 1;
    const ballNumber = `${overNumber}.${ballInOver}`;
    
    let commentary = `Ball ${ballNumber}: `;
    
    if (ball.isWicket) {
      commentary += `🏏 WICKET! ${ball.dismissalType?.toUpperCase()}`;
      if (ball.fielder) {
        const dismissalType = ball.dismissalType?.toLowerCase();
        if (dismissalType === 'caught') {
          commentary += ` - Great catch by ${ball.fielder}!`;
        } else if (dismissalType === 'run out') {
          commentary += ` - Sharp fielding by ${ball.fielder} breaks the stumps!`;
        } else if (dismissalType === 'stumped') {
          commentary += ` - Lightning fast stumping by ${ball.fielder}!`;
        } else {
          commentary += ` (fielded by ${ball.fielder})`;
        }
      }
      if (ball.runs > 0) {
        commentary += ` The batsman adds ${ball.runs} run${ball.runs > 1 ? 's' : ''} before departing.`;
      }
    } else if (ball.extras) {
      const extraType = ball.extras.type;
      let extraComment = '';
      
      switch (extraType) {
        case 'wide':
          extraComment = `📍 WIDE BALL! Bowler strays down the line. ${ball.extras.runs} extra run${ball.extras.runs > 1 ? 's' : ''} to the batting team.`;
          if (ball.runs > ball.extras.runs) {
            const batRuns = ball.runs - ball.extras.runs;
            extraComment += ` Batsman also manages to score ${batRuns} run${batRuns > 1 ? 's' : ''} off the wide delivery.`;
          }
          break;
        case 'no-ball':
          extraComment = `🚫 NO BALL! Free hit coming up! ${ball.extras.runs} penalty run${ball.extras.runs > 1 ? 's' : ''}.`;
          if (ball.runs > ball.extras.runs) {
            const batRuns = ball.runs - ball.extras.runs;
            if (batRuns === 4) {
              extraComment += ` Plus a magnificent FOUR off the no-ball!`;
            } else if (batRuns === 6) {
              extraComment += ` Plus a massive SIX off the no-ball!`;
            } else {
              extraComment += ` Batsman adds ${batRuns} more run${batRuns > 1 ? 's' : ''}.`;
            }
          }
          break;
        case 'bye':
          extraComment = `🏃 BYES! Ball beats everyone - keeper, batsman, and stumps. ${ball.extras.runs} run${ball.extras.runs > 1 ? 's' : ''} stolen by smart running.`;
          break;
        case 'leg-bye':
          extraComment = `🦵 LEG BYES! Ball hits the pad and deflects away. ${ball.extras.runs} run${ball.extras.runs > 1 ? 's' : ''} added to the total.`;
          break;
        default:
          extraComment = `${String(extraType).toUpperCase()} + ${ball.extras.runs} runs`;
          break;
      }
      commentary += extraComment;
    } else {
      if (ball.runs === 0) {
        const dotComments = [
          'Dot ball - solid defensive stroke',
          'Excellent line and length, batsman defends',
          'No run taken, good bowling',
          'Fielder cuts it off, no single possible',
          'Watchful leave by the batsman'
        ];
        commentary += dotComments[Math.floor(Math.random() * dotComments.length)];
      } else if (ball.runs === 1) {
        const singleComments = [
          'Quick single taken with smart running',
          'Nudged for a single, strike rotated',
          'Good running between the wickets',
          'Single to keep the scoreboard ticking'
        ];
        commentary += singleComments[Math.floor(Math.random() * singleComments.length)];
      } else if (ball.runs === 2) {
        const doubleComments = [
          'Excellent running! Two runs completed',
          'Good placement, easy couple of runs',
          'Hustled back for the second run',
          'Smart cricket, converts one into two'
        ];
        commentary += doubleComments[Math.floor(Math.random() * doubleComments.length)];
      } else if (ball.runs === 3) {
        commentary += 'Superb running! Three runs taken with excellent placement and quick feet';
      } else if (ball.runs === 4) {
        const fourComments = [
          '🎯 FOUR! Magnificent stroke through the covers!',
          '🎯 FOUR! Cracking shot down the ground!',
          '🎯 FOUR! Perfectly timed through the gaps!',
          '🎯 FOUR! Delightful stroke to the boundary!',
          '🎯 FOUR! Shot of the day! Textbook cricket!'
        ];
        commentary += fourComments[Math.floor(Math.random() * fourComments.length)];
      } else if (ball.runs === 6) {
        const sixComments = [
          '💥 SIX! MASSIVE! That ball has been absolutely demolished!',
          '💥 SIX! What a strike! Into the stands it goes!',
          '💥 SIX! Clean as a whistle! Perfect connection!',
          '💥 SIX! That\'s out of the park! Incredible power!',
          '💥 SIX! Maximum! The crowd is on its feet!'
        ];
        commentary += sixComments[Math.floor(Math.random() * sixComments.length)];
      } else if (ball.runs === 5) {
        commentary += `${ball.runs} runs! Excellent shot with an overthrow adding the extra run`;
      } else {
        commentary += `${ball.runs} runs taken - good cricket all around`;
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
          {!isMobile && (
            <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
              📊 This Over:
            </Typography>
          )}
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