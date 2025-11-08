import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Button, CircularProgress, Card, CardContent, Stack, Chip } from '@mui/material';
// use CSS Grid via Box for layout to avoid Grid typing/platform issues
import { useNavigate } from 'react-router-dom';
import { teamService, playerService, matchService } from '../services/api.service';

const HomePage: React.FC = () => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [counts, setCounts] = useState({ teams: 0, players: 0, matches: 0 });
	const [recentMatches, setRecentMatches] = useState<any[]>([]);

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);
				const [t, p, m] = await Promise.all([
					teamService.getAll(),
					playerService.getAll(),
					matchService.getAll(),
				]);
				setCounts({ teams: t.data.length || 0, players: p.data.length || 0, matches: m.data.length || 0 });
				// take latest 3 matches sorted by date desc
				const matches = (m.data || []).slice().sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
				setRecentMatches(matches.slice(0, 3));
			} catch (err) {
				console.error('HomePage: failed to fetch counts', err);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	return (
		<Box sx={{ p: { xs: 2, md: 4 } }}>
			{/* Hero */}
			<Paper sx={{ p: { xs: 2, md: 4 }, mb: 3, borderRadius: 3, background: 'linear-gradient(135deg,#020e43 0%,#764ba2 100%)', color: 'white' }}>
						<Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'center' }}>
							<Box sx={{ flex: 1, width: { xs: '100%', md: '66%' } }}>
								<Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>Street Cricket Scorer</Typography>
								<Typography variant="body1" sx={{ opacity: 0.9, mb: 2 }}>Minimal live scoring for street cricket</Typography>
								<Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
									<Button variant="contained" onClick={() => navigate('/matches')} sx={{ mr: 1 }}>View Matches</Button>
									<Button variant="outlined" onClick={() => navigate('/matches')} sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>Create Match</Button>
								</Stack>
							</Box>
							<Box sx={{ width: { xs: '100%', md: '34%' } }}>
								<Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
									<Chip label={loading ? '...' : `Teams: ${counts.teams}`} color="default" sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'white' }} />
									<Chip label={loading ? '...' : `Players: ${counts.players}`} color="default" sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'white' }} />
									<Chip label={loading ? '...' : `Matches: ${counts.matches}`} color="default" sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'white' }} />
								</Stack>
							</Box>
						</Box>
			</Paper>

			{/* Quick actions + Recent matches */}
						<Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
							<Box sx={{ width: { xs: '100%', md: '66%' } }}>
								<Paper sx={{ p: 2, borderRadius: 2 }}>
									<Typography variant="h6" sx={{ mb: 2 }}>Quick Actions</Typography>
									<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
										<Button variant="contained" onClick={() => navigate('/matches')} startIcon={<></>}>Create/View Matches</Button>
										<Button variant="outlined" onClick={() => navigate('/teams')}>Manage Teams</Button>
										<Button variant="outlined" onClick={() => navigate('/players')}>Manage Players</Button>
									</Stack>
								</Paper>
							</Box>

							<Box sx={{ width: { xs: '100%', md: '34%' } }}>
								<Card sx={{ borderRadius: 2 }}>
									<CardContent>
										<Typography variant="h6" sx={{ mb: 1 }}>Recent Matches</Typography>
										{loading ? (
											<CircularProgress size={20} />
										) : (
											recentMatches.length === 0 ? (
												<Typography variant="body2">No recent matches</Typography>
											) : (
												<Stack spacing={1}>
													{recentMatches.map((m: any) => (
														<Box key={m._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
														<Box>
															<Typography variant="subtitle2">{typeof m.team1 === 'object' ? m.team1.name : m.team1} vs {typeof m.team2 === 'object' ? m.team2.name : m.team2}</Typography>
															<Typography variant="caption" color="text.secondary">{new Date(m.date).toLocaleString()}</Typography>
														</Box>
														<Button size="small" onClick={() => navigate(`/matches/${m._id}/overview`)}>View</Button>
													</Box>
													))}
												</Stack>
											)
										)}
									</CardContent>
								</Card>
							</Box>
						</Box>
		</Box>
	);
};

export default HomePage;