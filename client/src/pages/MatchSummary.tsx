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
  Stack,
  Container,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { Match, Team, Player, BattingStats, BowlingStats } from '../types';
import { matchService, teamService, playerService } from '../services/api.service';

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
          elevation={6} 
          sx={{ 
            borderRadius: 3,
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #020e43 0%, #764ba2 100%)',
          }}
        >
          {/* Header */}
          <Box sx={{ 
            p: 3, 
            background: 'rgba(0, 0, 0, 0.2)',
            borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
          }}>
            <Typography 
              variant="h5" 
              sx={{ 
                color: 'white',
                fontWeight: 'bold',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1
              }}
            >
              {inningNumber === 0 ? '🥇' : '🥈'} {battingTeamName} - {inningNumber === 0 ? '1st' : '2nd'} Innings
            </Typography>
          </Box>

          {/* Score Summary */}
          <Box sx={{ 
            my: 2,
            mx: 3,
            p: 3, 
            background: 'rgba(255, 255, 255, 0.1)', 
            borderRadius: 2,
            border: '2px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)'
          }}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, 
              gap: 3,
              textAlign: 'center'
            }}>
              <Box>
                <Typography variant={isMobile ? "h4" : "h3"} sx={{ fontWeight: 'bold', color: '#ffd700' }}>
                  {inningData.totalRuns}/{inningData.wickets}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                  Score
                </Typography>
              </Box>
              <Box>
                <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 'bold', color: 'white' }}>
                  {(() => {
                    const totalBalls = inningData.balls || 0;
                    const completeOvers = Math.floor(totalBalls / 6);
                    const remainingBalls = totalBalls % 6;
                    return remainingBalls > 0 ? `${completeOvers}.${remainingBalls}` : completeOvers.toString();
                  })()}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                  Overs
                </Typography>
              </Box>
              <Box>
                <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 'bold', color: 'white' }}>
                  {(() => {
                    const totalBalls = inningData.balls || 0;
                    return totalBalls > 0 ? ((inningData.totalRuns / totalBalls) * 6).toFixed(2) : '0.00';
                  })()}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                  Run Rate
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Batting Section */}
          <Box sx={{ px: 3, pb: 2 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 2,
                color: 'white',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              🏏 Batting
            </Typography>
            <TableContainer 
              sx={{ 
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                mb: 3,
                overflowX: 'auto'
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ 
                    background: 'linear-gradient(135deg, #020e43 0%, #764ba2 100%)',
                    '& .MuiTableCell-head': {
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: isMobile ? '0.75rem' : '0.875rem'
                    }
                  }}>
                    <TableCell>{isMobile ? 'Player' : 'Batter'}</TableCell>
                    <TableCell align="right">{isMobile ? 'R' : 'Runs'}</TableCell>
                    <TableCell align="right">{isMobile ? 'B' : 'Balls'}</TableCell>
                    <TableCell align="right">4s</TableCell>
                    <TableCell align="right">6s</TableCell>
                    <TableCell align="right">SR</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inningData.battingStats.map((stat: BattingStats, index: number) => {
                    const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id;
                    const playerName = typeof stat.player === 'object' ? 
                      stat.player.name : 
                      (players[playerId]?.name || 'Unknown Player');
                    
                    return (
                      <TableRow 
                        key={playerId}
                        sx={{
                          backgroundColor: index % 2 === 0 ? 'rgba(255, 255, 255, 1)' : 'rgba(240, 240, 240, 1)',
                          '&:hover': {
                            backgroundColor: 'rgba(2, 14, 67, 0.05)',
                          }
                        }}
                      >
                        <TableCell sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                          <strong>{playerName}</strong>
                          {stat.isOnStrike && ' *'}
                          {stat.isOut && (
                            <Typography variant="caption" color="error" display="block">
                              ({stat.dismissalType || 'out'})
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                          {stat.runs || 0}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                          {stat.balls || 0}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                          {stat.fours || 0}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                          {stat.sixes || 0}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                          {calculateStrikeRate(stat.runs || 0, stat.balls || 0)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow sx={{ backgroundColor: 'rgba(2, 14, 67, 0.1)' }}>
                    <TableCell colSpan={6} sx={{ fontWeight: 'bold', fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                      Extras: w {inningData.extras.wides}, nb {inningData.extras.noBalls},
                      b {inningData.extras.byes}, lb {inningData.extras.legByes}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Fall of Wickets Section */}
          <Box sx={{ px: 3, pb: 3 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 2,
                color: 'white',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              📉 Fall of Wickets
            </Typography>
            <Box sx={{ 
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 2,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              p: 2
            }}>
              {(() => {
                // Calculate fall of wickets from batting stats
                const fallOfWickets = inningData.battingStats
                  .filter((stat: BattingStats) => stat.isOut)
                  .map((stat: BattingStats, index: number) => {
                    const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id;
                    const playerName = typeof stat.player === 'object' ? 
                      stat.player.name : 
                      (players[playerId]?.name || 'Unknown Player');
                    
                    // Calculate runs at this wicket (sum of all previous batsmen + this batsman)
                    let runsAtWicket = 0;
                    for (let i = 0; i <= inningData.battingStats.indexOf(stat); i++) {
                      runsAtWicket += inningData.battingStats[i].runs || 0;
                    }
                    
                    return {
                      wicketNumber: index + 1,
                      playerName,
                      runs: stat.runs,
                      balls: stat.balls,
                      totalRuns: runsAtWicket,
                      dismissalType: stat.dismissalType || 'out'
                    };
                  });

                if (fallOfWickets.length === 0) {
                  return (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#666', 
                        textAlign: 'center',
                        py: 2
                      }}
                    >
                      No wickets fallen yet
                    </Typography>
                  );
                }

                return (
                  <Stack spacing={1.5}>
                    {fallOfWickets.map((wicket: { wicketNumber: number; playerName: string; runs: number; balls: number; totalRuns: number; dismissalType: string }) => (
                      <Box
                        key={wicket.wicketNumber}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 1.5,
                          bgcolor: wicket.wicketNumber % 2 === 0 ? 'rgba(240, 240, 240, 0.5)' : 'transparent',
                          borderRadius: 1,
                          borderLeft: '4px solid #d32f2f',
                          '&:hover': {
                            bgcolor: 'rgba(2, 14, 67, 0.05)',
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                          <Chip
                            label={`${wicket.totalRuns}/${wicket.wicketNumber}`}
                            size="small"
                            sx={{
                              bgcolor: '#d32f2f',
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: isMobile ? '0.75rem' : '0.85rem',
                              minWidth: isMobile ? '60px' : '70px'
                            }}
                          />
                          <Box>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 'bold',
                                fontSize: isMobile ? '0.8rem' : '0.9rem',
                                color: '#1a1a2e'
                              }}
                            >
                              {wicket.playerName}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: '#666',
                                fontSize: isMobile ? '0.7rem' : '0.75rem'
                              }}
                            >
                              {wicket.runs}({wicket.balls}) • {wicket.dismissalType}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                );
              })()}
            </Box>
          </Box>

          {/* Bowling Section */}
          <Box sx={{ px: 3, pb: 3 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 2,
                color: 'white',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              ⚾ Bowling
            </Typography>
            <TableContainer 
              sx={{ 
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                overflowX: 'auto'
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ 
                    background: 'linear-gradient(135deg, #020e43 0%, #764ba2 100%)',
                    '& .MuiTableCell-head': {
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: isMobile ? '0.75rem' : '0.875rem'
                    }
                  }}>
                    <TableCell>{isMobile ? 'Player' : 'Bowler'}</TableCell>
                    <TableCell align="right">{isMobile ? 'O' : 'Overs'}</TableCell>
                    <TableCell align="right">M</TableCell>
                    <TableCell align="right">{isMobile ? 'R' : 'Runs'}</TableCell>
                    <TableCell align="right">{isMobile ? 'W' : 'Wickets'}</TableCell>
                    <TableCell align="right">Eco</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inningData.bowlingStats.map((stat: BowlingStats, index: number) => {
                    const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id;
                    const playerName = typeof stat.player === 'object' ? 
                      stat.player.name : 
                      (players[playerId]?.name || 'Unknown Player');
                    
                    const totalBalls = stat.balls || 0;
                    const completeOvers = Math.floor(totalBalls / 6);
                    const remainingBalls = totalBalls % 6;
                    const oversDisplay = remainingBalls > 0 ? `${completeOvers}.${remainingBalls}` : completeOvers.toString();
                    const economyRate = totalBalls > 0 ? ((stat.runs || 0) / totalBalls * 6).toFixed(2) : '0.00';
                    
                    return (
                      <TableRow 
                        key={playerId}
                        sx={{
                          backgroundColor: index % 2 === 0 ? 'rgba(255, 255, 255, 1)' : 'rgba(240, 240, 240, 1)',
                          '&:hover': {
                            backgroundColor: 'rgba(2, 14, 67, 0.05)',
                          }
                        }}
                      >
                        <TableCell sx={{ fontWeight: 'bold', fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                          {playerName}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                          {oversDisplay}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                          0
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                          {stat.runs || 0}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                          {stat.wickets || 0}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                          {economyRate}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      </Box>
    );
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!match) return <Typography>Match not found</Typography>;

  const getTopPerformers = () => {
    const innings1Batsmen: any[] = [];
    const innings1Bowlers: any[] = [];
    const innings2Batsmen: any[] = [];
    const innings2Bowlers: any[] = [];

    match.innings?.forEach((inning, index) => {
      const isFirstInnings = index === 0;
      const battingTeamName = isFirstInnings
        ? (typeof match.team1 === 'object' ? match.team1.name : teams[match.team1 as string]?.name || 'Team 1')
        : (typeof match.team2 === 'object' ? match.team2.name : teams[match.team2 as string]?.name || 'Team 2');
      
      const bowlingTeamName = isFirstInnings
        ? (typeof match.team2 === 'object' ? match.team2.name : teams[match.team2 as string]?.name || 'Team 2')
        : (typeof match.team1 === 'object' ? match.team1.name : teams[match.team1 as string]?.name || 'Team 1');

      // Get batting stats
      inning.battingStats.forEach((stat: BattingStats) => {
        const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id;
        const playerName = typeof stat.player === 'object' ? 
          stat.player.name : 
          (players[playerId]?.name || 'Unknown Player');
        
        const batsmanData = {
          name: playerName,
          runs: stat.runs || 0,
          balls: stat.balls || 0,
          strikeRate: stat.balls > 0 ? ((stat.runs / stat.balls) * 100).toFixed(1) : '0.0',
          fours: stat.fours || 0,
          sixes: stat.sixes || 0,
          teamName: battingTeamName
        };

        if (isFirstInnings) {
          innings1Batsmen.push(batsmanData);
        } else {
          innings2Batsmen.push(batsmanData);
        }
      });

      // Get bowling stats
      inning.bowlingStats.forEach((stat: BowlingStats) => {
        const playerId = typeof stat.player === 'string' ? stat.player : stat.player._id;
        const playerName = typeof stat.player === 'object' ? 
          stat.player.name : 
          (players[playerId]?.name || 'Unknown Player');
        
        const totalBalls = stat.balls || 0;
        const completeOvers = Math.floor(totalBalls / 6);
        const remainingBalls = totalBalls % 6;
        const oversDisplay = remainingBalls > 0 ? `${completeOvers}.${remainingBalls}` : `${completeOvers}`;
        const economy = totalBalls > 0 ? ((stat.runs || 0) / totalBalls * 6).toFixed(2) : '0.00';
        
        const bowlerData = {
          name: playerName,
          wickets: stat.wickets || 0,
          runs: stat.runs || 0,
          balls: totalBalls,
          overs: oversDisplay,
          economy: economy,
          teamName: bowlingTeamName
        };

        if (isFirstInnings) {
          innings1Bowlers.push(bowlerData);
        } else {
          innings2Bowlers.push(bowlerData);
        }
      });
    });

    // Sort and get top 3 batsmen for each innings
    const top3Innings1Batsmen = innings1Batsmen
      .filter(b => b.balls > 0)
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 3);

    const top3Innings2Batsmen = innings2Batsmen
      .filter(b => b.balls > 0)
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 3);

    // Sort and get top 3 bowlers for each innings (by wickets, then by economy)
    const top3Innings1Bowlers = innings1Bowlers
      .filter(b => b.balls > 0)
      .sort((a, b) => {
        if (b.wickets !== a.wickets) return b.wickets - a.wickets;
        return parseFloat(a.economy) - parseFloat(b.economy);
      })
      .slice(0, 3);

    const top3Innings2Bowlers = innings2Bowlers
      .filter(b => b.balls > 0)
      .sort((a, b) => {
        if (b.wickets !== a.wickets) return b.wickets - a.wickets;
        return parseFloat(a.economy) - parseFloat(b.economy);
      })
      .slice(0, 3);

    return { 
      top3Innings1Batsmen, 
      top3Innings2Batsmen,
      top3Innings1Bowlers, 
      top3Innings2Bowlers 
    };
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const renderTopPerformers = () => {
    const { 
      top3Innings1Batsmen, 
      top3Innings2Batsmen,
      top3Innings1Bowlers, 
      top3Innings2Bowlers 
    } = getTopPerformers();

    const innings1Team = typeof match.team1 === 'object' ? match.team1.name : (teams[match.team1 as string]?.name || 'Team 1');
    const innings2Team = typeof match.team2 === 'object' ? match.team2.name : (teams[match.team2 as string]?.name || 'Team 2');

    const renderInningsPerformers = (
      batsmen: any[], 
      bowlers: any[], 
      inningsNumber: number,
      teamName: string
    ) => (
      <Paper
        elevation={6}
        sx={{
          mb: 4,
          borderRadius: 3,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #020e43 0%, #764ba2 100%)',
        }}
      >
        {/* Header */}
        <Box sx={{ 
          p: 3, 
          background: 'rgba(0, 0, 0, 0.2)',
          borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
        }}>
          <Typography 
            variant="h5" 
            sx={{ 
              color: 'white',
              fontWeight: 'bold',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: 1
            }}
          >
            {inningsNumber === 1 ? '🥇' : '🥈'} {inningsNumber === 1 ? '1st' : '2nd'} Innings - {teamName}
          </Typography>
        </Box>

        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' },
          gap: 0
        }}>
          {/* Batting Section */}
          <Box sx={{ 
            flex: 1,
            p: 3,
            background: 'rgba(255, 255, 255, 0.05)',
            borderRight: { xs: 'none', md: '1px solid rgba(255, 255, 255, 0.1)' },
            borderBottom: { xs: '1px solid rgba(255, 255, 255, 0.1)', md: 'none' }
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 3,
              pb: 2,
              borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
            }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: 'white',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                🏏 Top Batting
              </Typography>
            </Box>
            
            {batsmen.length > 0 ? (
              <Stack spacing={2}>
                {batsmen.map((batsman, index) => (
                  <Box 
                    key={index}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      background: index === 0 
                        ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 193, 7, 0.1) 100%)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: index === 0 ? '2px solid rgba(255, 215, 0, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateX(8px)',
                        background: 'rgba(255, 255, 255, 0.1)',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          {index === 0 && <Typography sx={{ fontSize: '1.2rem' }}>👑</Typography>}
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: isMobile ? '1rem' : '1.1rem'
                            }}
                          >
                            {batsman.name}
                          </Typography>
                        </Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: isMobile ? '0.75rem' : '0.875rem'
                          }}
                        >
                          {batsman.teamName}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography 
                          variant="h4" 
                          sx={{ 
                            color: index === 0 ? '#ffd700' : '#4ade80',
                            fontWeight: 'bold',
                            fontSize: isMobile ? '1.5rem' : '2rem',
                            lineHeight: 1
                          }}
                        >
                          {batsman.runs}({batsman.balls})
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontSize: isMobile ? '0.7rem' : '0.75rem'
                          }}
                        >
                          SR: {batsman.strikeRate} • 4s: {batsman.fours} • 6s: {batsman.sixes}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', py: 2 }}>
                No batting performances recorded
              </Typography>
            )}
          </Box>

          {/* Bowling Section */}
          <Box sx={{ 
            flex: 1,
            p: 3,
            background: 'rgba(255, 255, 255, 0.05)'
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 3,
              pb: 2,
              borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
            }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: 'white',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                🎯 Top Bowling
              </Typography>
            </Box>
            
            {bowlers.length > 0 ? (
              <Stack spacing={2}>
                {bowlers.map((bowler, index) => (
                  <Box 
                    key={index}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      background: index === 0 
                        ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 193, 7, 0.1) 100%)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: index === 0 ? '2px solid rgba(255, 215, 0, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateX(8px)',
                        background: 'rgba(255, 255, 255, 0.1)',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          {index === 0 && <Typography sx={{ fontSize: '1.2rem' }}>👑</Typography>}
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: isMobile ? '1rem' : '1.1rem'
                            }}
                          >
                            {bowler.name}
                          </Typography>
                        </Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: isMobile ? '0.75rem' : '0.875rem'
                          }}
                        >
                          {bowler.teamName}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography 
                          variant="h4" 
                          sx={{ 
                            color: index === 0 ? '#ffd700' : '#f87171',
                            fontWeight: 'bold',
                            fontSize: isMobile ? '1.5rem' : '2rem',
                            lineHeight: 1
                          }}
                        >
                          {bowler.wickets}/{bowler.runs}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontSize: isMobile ? '0.7rem' : '0.75rem'
                          }}
                        >
                          {bowler.overs} Ov • Econ: {bowler.economy}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', py: 2 }}>
                No bowling performances recorded
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>
    );

    return (
      <Box>
        {/* 1st Innings Performers */}
        {renderInningsPerformers(top3Innings1Batsmen, top3Innings1Bowlers, 1, innings1Team)}

        {/* 2nd Innings Performers (if exists) */}
        {match.innings && match.innings.length > 1 && (
          renderInningsPerformers(top3Innings2Batsmen, top3Innings2Bowlers, 2, innings2Team)
        )}
      </Box>
    );
  };

  return (
    <Container 
      maxWidth="lg" 
      sx={{
        minHeight: 'calc(100vh - 120px)', // Adjusted for header height
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        padding: { xs: 0, sm: 2 }, // Remove padding on mobile (xs: 0)
        margin: { xs: 0, sm: 'auto' }, // Remove auto margins on mobile
      }}
    >
      <Paper
        elevation={8}
        sx={{
          maxWidth: '1200px',
          margin: { xs: 0, sm: '0 auto' }, // Full width on mobile
          padding: { xs: 1, sm: 4 }, // Minimal padding on mobile
          borderRadius: { xs: 0, sm: 3 }, // No border radius on mobile for full width
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
      </Paper>
    </Container>
  );
};

export default MatchSummary;