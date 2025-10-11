import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Chip,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { Match, Team, Player, BattingStats, BowlingStats } from '../types';
import { matchService, teamService, playerService } from '../services/api.service';

const MatchSummary: React.FC = () => {
  const { matchId } = useParams();
  const [match, setMatch] = useState<Match | null>(null);
  const [teams, setTeams] = useState<{ [key: string]: Team }>({});
  const [players, setPlayers] = useState<{ [key: string]: Player }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatchData();
  }, [matchId]);

  const fetchMatchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch match details
      const matchResponse = await matchService.getById(matchId!);
      setMatch(matchResponse.data);

      // Fetch all teams
      const teamsResponse = await teamService.getAll();
      const teamsMap = teamsResponse.data.reduce((acc: any, team: Team) => {
        acc[team._id!] = team;
        return acc;
      }, {});
      setTeams(teamsMap);

      // Fetch all players
      const playersResponse = await playerService.getAll();
      const playersMap = playersResponse.data.reduce((acc: any, player: Player) => {
        acc[player._id!] = player;
        return acc;
      }, {});
      setPlayers(playersMap);
    } catch (error) {
      setError('Error fetching match data');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStrikeRate = (runs: number, balls: number) => {
    if (balls === 0) return 0;
    return ((runs / balls) * 100).toFixed(2);
  };

  const calculateEconomyRate = (runs: number, overs: number) => {
    if (overs === 0) return 0;
    return (runs / overs).toFixed(2);
  };

  const renderInningsSummary = (inningData: any, inningNumber: number) => {
    const battingTeamName = teams[inningData.battingTeam]?.name || 'Unknown Team';
    const bowlingTeamName = teams[inningData.bowlingTeam]?.name || 'Unknown Team';

    return (
      <Box sx={{ mb: 4 }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {battingTeamName} Innings {match?.status === 'completed' && `(${inningNumber === 0 ? '1st' : '2nd'} Innings)`}
          </Typography>

          <Box sx={{ my: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, 
              gap: 2 
            }}>
              <Box>
                <Typography variant="h4">
                  {inningData.totalRuns}/{inningData.wickets}
                </Typography>
              </Box>
              <Box>
                <Typography>
                  Overs: {inningData.overs}
                </Typography>
              </Box>
              <Box>
                <Typography>
                  RR: {calculateEconomyRate(inningData.totalRuns, inningData.overs)}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Batting
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Batter</TableCell>
                  <TableCell align="right">Runs</TableCell>
                  <TableCell align="right">Balls</TableCell>
                  <TableCell align="right">4s</TableCell>
                  <TableCell align="right">6s</TableCell>
                  <TableCell align="right">SR</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inningData.battingStats.map((stat: BattingStats) => {
                  const playerName = typeof stat.player === 'object' ? stat.player.name : 'Unknown';
                  return (
                    <TableRow key={typeof stat.player === 'object' ? stat.player._id : stat.player}>
                      <TableCell>
                        {playerName}
                        {stat.isOut && (
                          <Typography variant="caption" color="error">
                            {' '}(out)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{stat.runs}</TableCell>
                      <TableCell align="right">{stat.balls}</TableCell>
                      <TableCell align="right">{stat.fours}</TableCell>
                      <TableCell align="right">{stat.sixes}</TableCell>
                      <TableCell align="right">
                        {calculateStrikeRate(stat.runs, stat.balls)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="subtitle2">
                      Extras: w {inningData.extras.wides}, nb {inningData.extras.noBalls},
                      b {inningData.extras.byes}, lb {inningData.extras.legByes}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Bowling
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Bowler</TableCell>
                  <TableCell align="right">O</TableCell>
                  <TableCell align="right">M</TableCell>
                  <TableCell align="right">R</TableCell>
                  <TableCell align="right">W</TableCell>
                  <TableCell align="right">Econ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inningData.bowlingStats.map((stat: BowlingStats) => {
                  const playerName = typeof stat.player === 'object' ? stat.player.name : 'Unknown';
                  return (
                    <TableRow key={typeof stat.player === 'object' ? stat.player._id : stat.player}>
                      <TableCell>{playerName}</TableCell>
                      <TableCell align="right">{stat.overs.toFixed(1)}</TableCell>
                      <TableCell align="right">{0}</TableCell>
                      <TableCell align="right">{stat.runs}</TableCell>
                      <TableCell align="right">{stat.wickets}</TableCell>
                      <TableCell align="right">
                        {calculateEconomyRate(stat.runs, stat.overs)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    );
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!match) return <Typography>Match not found</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {typeof match.team1 === 'object' ? match.team1.name : match.team1} vs {typeof match.team2 === 'object' ? match.team2.name : match.team2}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Chip 
            label={match.status} 
            color={
              match.status === 'completed' ? 'success' : 
              match.status === 'in-progress' ? 'warning' : 
              'default'
            } 
          />
          <Typography>
            {new Date(match.date).toLocaleDateString()} at {match.venue || 'TBD'}
          </Typography>
        </Box>
      </Box>

      {match.innings?.map((innings, index) => renderInningsSummary(innings, index))}

      {match.status === 'completed' && match.result && (
        <Paper elevation={3} sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="h6">
            {match.result}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default MatchSummary;