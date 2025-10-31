import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Button, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { teamService, playerService, matchService } from '../services/api.service';

const HomePage: React.FC = () => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [counts, setCounts] = useState({ teams: 0, players: 0, matches: 0 });

	useEffect(() => {
		const fetchCounts = async () => {
			try {
				setLoading(true);
				const [t, p, m] = await Promise.all([
					teamService.getAll(),
					playerService.getAll(),
					matchService.getAll(),
				]);
				setCounts({ teams: t.data.length || 0, players: p.data.length || 0, matches: m.data.length || 0 });
			} catch (err) {
				console.error('HomePage: failed to fetch counts', err);
			} finally {
				setLoading(false);
			}
		};

		fetchCounts();
	}, []);

	return (
		<Box sx={{ p: 2 }}>
			<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
				<Paper sx={{ p: 3, textAlign: 'center' }}>
					<Typography variant="h6">Players</Typography>
					{loading ? <CircularProgress size={20} /> : <Typography variant="h4">{counts.players}</Typography>}
					<Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/players')}>Manage Players</Button>
				</Paper>

				<Paper sx={{ p: 3, textAlign: 'center' }}>
					<Typography variant="h6">Teams</Typography>
					{loading ? <CircularProgress size={20} /> : <Typography variant="h4">{counts.teams}</Typography>}
					<Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/teams')}>Manage Teams</Button>
				</Paper>

				<Paper sx={{ p: 3, textAlign: 'center' }}>
					<Typography variant="h6">Matches</Typography>
					{loading ? <CircularProgress size={20} /> : <Typography variant="h4">{counts.matches}</Typography>}
					<Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/matches')}>View Matches</Button>
				</Paper>
			</Box>
		</Box>
	);
};

export default HomePage;