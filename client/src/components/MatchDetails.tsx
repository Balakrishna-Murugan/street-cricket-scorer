import React from 'react';
import { Box, Typography } from '@mui/material';
import { Player, BallOutcome } from '../types';

interface MatchDetailsProps {
  totalRuns: number;
  wickets: number;
  overs: number;
  currentOverBalls: BallOutcome[];
  striker: string;
  nonStriker: string;
  bowler: string;
  players: Player[];
  strikerStats: { runs: number; balls: number };
  nonStrikerStats: { runs: number; balls: number };
  bowlerStats: { overs: number; runs: number; wickets: number };
}

const MatchDetails: React.FC<MatchDetailsProps> = ({
  totalRuns,
  wickets,
  overs,
  currentOverBalls,
  striker,
  nonStriker,
  bowler,
  players,
  strikerStats,
  nonStrikerStats,
  bowlerStats,
}) => {
  const formatBall = (ball: BallOutcome) => {
    if (ball.isWicket) return 'W';
    if (ball.extras) {
      const prefix = ball.extras.type === 'wide' ? 'Wd' :
                    ball.extras.type === 'no-ball' ? 'Nb' :
                    ball.extras.type === 'bye' ? 'B' : 'Lb';
      return prefix + ball.extras.runs;
    }
    return ball.runs.toString();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          {totalRuns}/{wickets}
        </Typography>
        <Typography variant="h6">
          Overs: {overs.toFixed(1)}
        </Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
          This Over: {currentOverBalls.map(formatBall).join(' ')}
        </Typography>
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
          {bowlerStats.overs.toFixed(1)}-{bowlerStats.wickets}-{bowlerStats.runs}
        </Typography>
      </Box>
    </Box>
  );
};

export default MatchDetails;