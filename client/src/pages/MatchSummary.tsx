import React, { useState, useEffect, useCallback } from 'react';
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
  Chip,
  Tabs,
  Tab,
  Card,
  CardContent,
  Container,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { Match, Team, Player, BattingStats, BowlingStats } from '../types';
import { matchService, teamService, playerService } from '../services/api.service';
import MatchCommentary from '../components/MatchCommentary';

const MatchSummary: React.FC = () => {
  const { matchId } = useParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [match, setMatch] = useState<Match | null>(null);
  const [teams, setTeams] = useState<{ [key: string]: Team }>({});
  const [players, setPlayers] = useState<{ [key: string]: Player }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const fetchMatchData = useCallback(async () => {
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
  }, [matchId]);

  useEffect(() => {
    fetchMatchData();
  }, [fetchMatchData]);

  const calculateStrikeRate = (runs: number, balls: number) => {
    if (balls === 0) return 0;
    return ((runs / balls) * 100).toFixed(2);
  };

  const renderInningsSummary = (inningData: any, inningNumber: number) => {
    // FIXED: Handle both string ID and populated object for battingTeam
    const battingTeamId = typeof inningData.battingTeam === 'string' 
      ? inningData.battingTeam 
      : inningData.battingTeam._id;
    const battingTeamName = teams[battingTeamId]?.name || 
      (typeof inningData.battingTeam === 'object' ? inningData.battingTeam.name : null) ||
      'Unknown Team';

    return (
      <Box sx={{ mb: 4 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3,
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0',
          }}
        >
          <Typography 
            variant="h5" 
            gutterBottom
            sx={{ 
              color: '#2c3e50',
              fontWeight: 'bold',
              mb: 2
            }}
          >
            🏏 {battingTeamName} Innings {match?.status === 'completed' && `(${inningNumber === 0 ? '1st' : '2nd'} Innings)`}
          </Typography>

          <Box sx={{ 
            my: 2, 
            p: 3, 
            background: 'linear-gradient(45deg, #e3f2fd 30%, #bbdefb 90%)', 
            borderRadius: '12px',
            border: '1px solid #2196F3'
          }}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, 
              gap: 3,
              textAlign: 'center'
            }}>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1565c0' }}>
                  {inningData.totalRuns}/{inningData.wickets}
                </Typography>
                <Typography variant="body2" color="textSecondary">Score</Typography>
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1565c0' }}>
                  {(() => {
                    const totalBalls = inningData.balls || 0;
                    const completeOvers = Math.floor(totalBalls / 6);
                    const remainingBalls = totalBalls % 6;
                    return remainingBalls > 0 ? `${completeOvers}.${remainingBalls}` : completeOvers.toString();
                  })()}
                </Typography>
                <Typography variant="body2" color="textSecondary">Overs</Typography>
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1565c0' }}>
                  {(() => {
                    const totalBalls = inningData.balls || 0;
                    return totalBalls > 0 ? ((inningData.totalRuns / totalBalls) * 6).toFixed(2) : '0.00';
                  })()}
                </Typography>
                <Typography variant="body2" color="textSecondary">Run Rate</Typography>
              </Box>
            </Box>
          </Box>

          <Typography 
            variant="h6" 
            gutterBottom 
            sx={{ 
              mt: 3,
              color: '#2c3e50',
              fontWeight: 'bold'
            }}
          >
            🏏 Batting
          </Typography>
          <TableContainer 
            sx={{ 
              background: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: '1px solid #e0e0e0',
              mb: 3,
              overflowX: 'auto'
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ 
                  background: '#2196F3',
                  '& .MuiTableCell-head': {
                    color: '#fff',
                    fontWeight: 'bold'
                  }
                }}>
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
                  const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id;
                  const playerName = typeof stat.player === 'object' ? 
                    stat.player.name : 
                    (players[playerId]?.name || 'Unknown Player');
                  
                  return (
                    <TableRow key={playerId}>
                      <TableCell>
                        {playerName}
                        {stat.isOnStrike && ' *'}
                        {stat.isOut && (
                          <Typography variant="caption" color="error">
                            {' '}({stat.dismissalType || 'out'})
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{stat.runs || 0}</TableCell>
                      <TableCell align="right">{stat.balls || 0}</TableCell>
                      <TableCell align="right">{stat.fours || 0}</TableCell>
                      <TableCell align="right">{stat.sixes || 0}</TableCell>
                      <TableCell align="right">
                        {calculateStrikeRate(stat.runs || 0, stat.balls || 0)}
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

          <Typography 
            variant="h6" 
            gutterBottom 
            sx={{ 
              mt: 3,
              color: '#2c3e50',
              fontWeight: 'bold'
            }}
          >
            🎯 Bowling
          </Typography>
          <TableContainer 
            sx={{ 
              background: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: '1px solid #e0e0e0',
              overflowX: 'auto'
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ 
                  background: '#FF5722',
                  '& .MuiTableCell-head': {
                    color: '#fff',
                    fontWeight: 'bold'
                  }
                }}>
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
                  const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id;
                  const playerName = typeof stat.player === 'object' ? 
                    stat.player.name : 
                    (players[playerId]?.name || 'Unknown Player');
                    
                  // Format overs properly (balls to overs.balls format)
                  const totalBalls = stat.balls || 0;
                  const completeOvers = Math.floor(totalBalls / 6);
                  const remainingBalls = totalBalls % 6;
                  const oversDisplay = remainingBalls > 0 ? `${completeOvers}.${remainingBalls}` : completeOvers.toString();
                  
                  // Calculate economy based on balls bowled
                  const economyRate = totalBalls > 0 ? ((stat.runs || 0) / totalBalls * 6).toFixed(2) : '0.00';
                  
                  return (
                    <TableRow key={playerId}>
                      <TableCell>{playerName}</TableCell>
                      <TableCell align="right">{oversDisplay}</TableCell>
                      <TableCell align="right">{0}</TableCell>
                      <TableCell align="right">{stat.runs || 0}</TableCell>
                      <TableCell align="right">{stat.wickets || 0}</TableCell>
                      <TableCell align="right">{economyRate}</TableCell>
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

  const getTopPerformers = () => {
    const allBatsmen: any[] = [];
    const allBowlers: any[] = [];

    match.innings?.forEach((inning, index) => {
      // Get batting stats
      inning.battingStats.forEach((stat: BattingStats) => {
        const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id;
        const playerName = typeof stat.player === 'object' ? 
          stat.player.name : 
          (players[playerId]?.name || 'Unknown Player');
        
        allBatsmen.push({
          name: playerName,
          runs: stat.runs,
          balls: stat.balls,
          strikeRate: stat.balls > 0 ? ((stat.runs / stat.balls) * 100).toFixed(2) : '0.00',
          fours: stat.fours,
          sixes: stat.sixes,
          innings: index + 1,
          teamName: index === 0 ? 
            (typeof match.team1 === 'object' ? match.team1.name : match.team1) :
            (typeof match.team2 === 'object' ? match.team2.name : match.team2)
        });
      });

      // Get bowling stats
      inning.bowlingStats.forEach((stat: BowlingStats) => {
        const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id;
        const playerName = typeof stat.player === 'object' ? 
          stat.player.name : 
          (players[playerId]?.name || 'Unknown Player');
        
        const totalBalls = stat.balls || 0;
        const economy = totalBalls > 0 ? ((stat.runs || 0) / totalBalls * 6).toFixed(2) : '0.00';
        
        allBowlers.push({
          name: playerName,
          wickets: stat.wickets,
          runs: stat.runs,
          balls: totalBalls,
          economy: economy,
          innings: index + 1,
          teamName: index === 0 ? 
            (typeof match.team2 === 'object' ? match.team2.name : match.team2) :
            (typeof match.team1 === 'object' ? match.team1.name : match.team1)
        });
      });
    });

    // Sort batsmen by runs (desc)
    const topBatsmen = allBatsmen
      .filter(b => b.runs > 0)
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 4);

    // Sort bowlers by wickets (desc), then by economy (asc)
    const topBowlers = allBowlers
      .filter(b => b.balls > 0)
      .sort((a, b) => {
        if (b.wickets !== a.wickets) return b.wickets - a.wickets;
        return parseFloat(a.economy) - parseFloat(b.economy);
      })
      .slice(0, 4);

    return { topBatsmen, topBowlers };
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const renderTopPerformers = () => {
    const { topBatsmen, topBowlers } = getTopPerformers();

    return (
      <Box>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" gutterBottom sx={{ color: '#2c3e50', fontWeight: 'bold', mb: 3 }}>
              🏏 Top Batsmen
            </Typography>
            {topBatsmen.map((batsman, index) => (
              <Card key={index} sx={{ mb: 2, borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                        {batsman.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {batsman.teamName} • Innings {batsman.innings}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#4CAF50' }}>
                        {batsman.runs}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {batsman.balls} balls • SR: {batsman.strikeRate}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        4s: {batsman.fours} • 6s: {batsman.sixes}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" gutterBottom sx={{ color: '#2c3e50', fontWeight: 'bold', mb: 3 }}>
              🎯 Top Bowlers
            </Typography>
            {topBowlers.map((bowler, index) => (
              <Card key={index} sx={{ mb: 2, borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                        {bowler.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {bowler.teamName} • Innings {bowler.innings}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#FF5722' }}>
                        {bowler.wickets}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {bowler.runs} runs • {Math.floor(bowler.balls / 6)}.{bowler.balls % 6} overs
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Economy: {bowler.economy}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Container 
      maxWidth="lg" 
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        padding: { xs: 1, sm: 3 },
      }}
    >
      <Paper
        elevation={8}
        sx={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: { xs: 2, sm: 4 },
          borderRadius: 3,
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography 
            variant="h3" 
            gutterBottom
            sx={{ 
              fontWeight: 'bold',
              textAlign: 'center',
              color: '#2c3e50',
              mb: 4,
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            🏏 {typeof match.team1 === 'object' ? match.team1.name : match.team1} vs {typeof match.team2 === 'object' ? match.team2.name : match.team2}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
            <Chip 
              label={match.status} 
              color={
                match.status === 'completed' ? 'success' : 
                match.status === 'in-progress' ? 'warning' : 
                'default'
              }
              sx={{ fontWeight: 'bold', fontSize: '1rem' }}
            />
            <Typography sx={{ color: '#2c3e50', fontWeight: 500 }}>
              📅 {new Date(match.date).toLocaleDateString()} • 📍 {match.venue || 'TBD'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            variant={isMobile ? "scrollable" : "standard"}
            scrollButtons={isMobile ? "auto" : false}
            allowScrollButtonsMobile
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              '& .MuiTab-root': {
                fontWeight: 'bold',
                fontSize: { xs: '0.875rem', sm: '1rem' },
                minWidth: { xs: 80, sm: 160 },
                padding: { xs: '6px 8px', sm: '12px 16px' }
              },
              '& .MuiTabs-scrollButtons': {
                '&.Mui-disabled': {
                  opacity: 0.3,
                },
              },
            }}
          >
            <Tab label="📊 Match Summary" />
            <Tab label="🏆 Top Performers" />
            <Tab label="📝 Commentary" />
          </Tabs>
        </Box>

        {tabValue === 0 && (
          <Box>
            {match.innings?.map((innings, index) => renderInningsSummary(innings, index))}

            {match.status === 'completed' && match.result && (
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 3, 
                  background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)', 
                  color: 'white',
                  borderRadius: '12px',
                  textAlign: 'center',
                  mt: 3,
                  boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  🎉 {match.result}
                </Typography>
              </Paper>
            )}
          </Box>
        )}

        {tabValue === 1 && renderTopPerformers()}
        
        {tabValue === 2 && (
          <Box sx={{ mt: 3 }}>
            <MatchCommentary match={match} />
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default MatchSummary;