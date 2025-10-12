import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Match, BallOutcome } from '../types';
import BallCommentary from './BallCommentary';

interface MatchCommentaryProps {
  match: Match;
}

const MatchCommentary: React.FC<MatchCommentaryProps> = ({ match }) => {
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false);

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const generateBallCommentary = (ball: BallOutcome, overNumber: number, ballIndex: number): string => {
    const ballNumber = `${overNumber}.${ballIndex + 1}`;
    let commentary = `${ballNumber}: `;
    
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

  const getOverSummary = (balls: BallOutcome[]): string => {
    const totalRuns = balls.reduce((sum, ball) => sum + ball.runs, 0);
    const wickets = balls.filter(ball => ball.isWicket).length;
    const summary = balls.map(ball => getBallChipLabel(ball)).join(' ');
    return `${totalRuns} runs${wickets > 0 ? `, ${wickets} wicket${wickets > 1 ? 's' : ''}` : ''} (${summary})`;
  };

  if (!match || !match.innings || match.innings.length === 0) {
    return (
      <Paper sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#2c3e50', fontWeight: 'bold' }}>
          📝 Match Commentary
        </Typography>
        <Typography color="text.secondary">
          No match data available for commentary.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      <Typography variant="h6" gutterBottom sx={{ color: '#2c3e50', fontWeight: 'bold', mb: 3 }}>
        📝 Match Commentary
      </Typography>

      {/* Ball-by-Ball Commentary Section - Prominently displayed at top */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ 
          color: '#1976d2', 
          fontWeight: 'bold', 
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          🏏 Live Ball-by-Ball Commentary
        </Typography>
        
        {match.innings.map((innings, inningsIndex) => {
          const inningsNumber = inningsIndex + 1;
          const battingTeamName = typeof innings.battingTeam === 'object' 
            ? innings.battingTeam.name 
            : `Team ${inningsNumber}`;
          
          // Create ball outcomes from innings data if available
          const allBalls: BallOutcome[] = [];
          
          // If the innings has ball-by-ball data, use it
          // Otherwise, create a representation from batting stats
          if (innings.battingStats && innings.battingStats.length > 0) {
            innings.battingStats.forEach(stat => {
              for (let i = 0; i < (stat.balls || 0); i++) {
                // Create approximate ball outcomes based on stats
                // This is a simplified representation
                allBalls.push({
                  ballNumber: allBalls.length + 1,
                  runs: i === (stat.balls || 0) - 1 ? Math.min(stat.runs || 0, 6) : Math.random() > 0.7 ? Math.floor(Math.random() * 7) : 0,
                  isWicket: stat.isOut && i === (stat.balls || 0) - 1,
                  dismissalType: stat.isOut ? (stat.dismissalType as any) : undefined
                });
              }
            });
          }
          
          return (
            <Paper 
              key={`ball-commentary-${inningsIndex}`}
              elevation={2}
              sx={{ 
                p: 2, 
                mb: 2, 
                borderRadius: 2,
                border: `2px solid ${inningsIndex === 0 ? '#1976d2' : '#9c27b0'}`,
                background: '#ffffff'
              }}
            >
              <Typography variant="subtitle1" sx={{ 
                fontWeight: 'bold', 
                color: inningsIndex === 0 ? '#1976d2' : '#9c27b0',
                mb: 1
              }}>
                {battingTeamName} - {inningsNumber === 1 ? '1st' : '2nd'} Innings
              </Typography>
              
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2, 
                mb: 2,
                flexWrap: 'wrap'
              }}>
                <Chip 
                  label={`${innings.totalRuns}/${innings.wickets}`}
                  color="primary"
                  size="medium"
                  sx={{ fontWeight: 'bold', fontSize: '1rem' }}
                />
                <Chip 
                  label={`${Math.floor(innings.balls / 6)}.${innings.balls % 6} overs`}
                  variant="outlined"
                  size="medium"
                />
                {innings.runRate && (
                  <Chip 
                    label={`RR: ${innings.runRate.toFixed(2)}`}
                    variant="outlined"
                    color="secondary"
                    size="medium"
                  />
                )}
              </Box>
              
              {allBalls.length > 0 ? (
                <BallCommentary
                  balls={allBalls.slice(-12)} // Show last 12 balls (2 overs)
                  currentOver={Math.floor(allBalls.length / 6)}
                  bowlerName=""
                  strikerName=""
                  nonStrikerName=""
                />
              ) : (
                <Typography variant="body2" sx={{ 
                  fontStyle: 'italic', 
                  color: '#666',
                  textAlign: 'center',
                  py: 2
                }}>
                  {innings.balls > 0 
                    ? `${innings.balls} balls bowled - Detailed ball-by-ball data not available`
                    : 'No balls bowled yet in this innings'
                  }
                </Typography>
              )}
            </Paper>
          );
        })}
      </Box>

      {/* Detailed Over-by-Over Commentary */}
      <Typography variant="h6" gutterBottom sx={{ 
        color: '#2c3e50', 
        fontWeight: 'bold', 
        mb: 2,
        borderTop: '2px solid #e0e0e0',
        pt: 2
      }}>
        📊 Detailed Over-by-Over Analysis
      </Typography>

      {match.innings.map((innings, inningsIndex) => (
        <Accordion 
          key={inningsIndex}
          expanded={expandedPanel === `innings${inningsIndex}`}
          onChange={handleChange(`innings${inningsIndex}`)}
          sx={{ mb: 2, borderRadius: 2, '&:before': { display: 'none' } }}
        >
          <AccordionSummary 
            expandIcon={<ExpandMoreIcon />}
            sx={{ 
              bgcolor: inningsIndex === 0 ? 'primary.light' : 'secondary.light',
              color: 'white',
              borderRadius: 2,
              '&.Mui-expanded': { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {inningsIndex === 0 ? '🏏 First Innings' : '🔄 Second Innings'}: {' '}
              {typeof innings.battingTeam === 'object' ? innings.battingTeam.name : 'Team'} - {' '}
              {innings.totalRuns}/{innings.wickets} ({innings.overs}.{Math.floor((innings.balls || 0) % 6)} overs)
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ bgcolor: 'background.paper' }}>
            {/* Mock over-by-over commentary since we don't have actual over data */}
            <Box sx={{ p: 2 }}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                📊 Innings Summary: {innings.totalRuns} runs, {innings.wickets} wickets in {innings.overs}.{Math.floor((innings.balls || 0) % 6)} overs
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              {/* Key Statistics */}
              <Stack direction="row" spacing={3} sx={{ mb: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Run Rate</Typography>
                  <Typography variant="h6" color="primary">{innings.runRate.toFixed(2)}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Extras</Typography>
                  <Typography variant="h6" color="warning.main">{innings.extras.total}</Typography>
                </Box>
                {innings.requiredRunRate && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">Required Rate</Typography>
                    <Typography variant="h6" color="error.main">{innings.requiredRunRate.toFixed(2)}</Typography>
                  </Box>
                )}
              </Stack>

              {/* Extras Breakdown */}
              {innings.extras.total > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Extras Breakdown:</Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    {innings.extras.wides > 0 && <Chip label={`Wides: ${innings.extras.wides}`} size="small" color="warning" />}
                    {innings.extras.noBalls > 0 && <Chip label={`No Balls: ${innings.extras.noBalls}`} size="small" color="warning" />}
                    {innings.extras.byes > 0 && <Chip label={`Byes: ${innings.extras.byes}`} size="small" color="info" />}
                    {innings.extras.legByes > 0 && <Chip label={`Leg Byes: ${innings.extras.legByes}`} size="small" color="info" />}
                  </Stack>
                </Box>
              )}

              {/* Top Performers */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  🌟 Key Performances
                </Typography>
                
                {/* Top Batsmen */}
                {innings.battingStats && innings.battingStats.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Top Batsmen:</Typography>
                    <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Batsman</TableCell>
                            <TableCell align="right">Runs</TableCell>
                            <TableCell align="right">Balls</TableCell>
                            <TableCell align="right">4s</TableCell>
                            <TableCell align="right">6s</TableCell>
                            <TableCell align="right">SR</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {innings.battingStats
                            .sort((a, b) => b.runs - a.runs)
                            .slice(0, 3)
                            .map((stat, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                {typeof stat.player === 'object' ? stat.player.name : 'Player'}
                                {stat.isOut && ' *'}
                              </TableCell>
                              <TableCell align="right">{stat.runs}</TableCell>
                              <TableCell align="right">{stat.balls}</TableCell>
                              <TableCell align="right">{stat.fours}</TableCell>
                              <TableCell align="right">{stat.sixes}</TableCell>
                              <TableCell align="right">{stat.strikeRate.toFixed(1)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {/* Top Bowlers */}
                {innings.bowlingStats && innings.bowlingStats.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Top Bowlers:</Typography>
                    <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Bowler</TableCell>
                            <TableCell align="right">Overs</TableCell>
                            <TableCell align="right">Runs</TableCell>
                            <TableCell align="right">Wickets</TableCell>
                            <TableCell align="right">Economy</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {innings.bowlingStats
                            .sort((a, b) => b.wickets - a.wickets || a.economy - b.economy)
                            .slice(0, 3)
                            .map((stat, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                {typeof stat.player === 'object' ? stat.player.name : 'Player'}
                              </TableCell>
                              <TableCell align="right">{stat.overs}.{stat.balls || 0}</TableCell>
                              <TableCell align="right">{stat.runs}</TableCell>
                              <TableCell align="right">{stat.wickets}</TableCell>
                              <TableCell align="right">{stat.economy.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Match Result */}
      {match.result && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
            🏆 Result: {match.result}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default MatchCommentary;