import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';
import { Match } from '../types';
import { matchService } from '../services/api.service';
import MatchCommentary from '../components/MatchCommentary';

const MatchCommentaryPage: React.FC = () => {
  const { matchId } = useParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch match details
        const matchResponse = await matchService.getById(matchId!);
        setMatch(matchResponse.data);
      } catch (err) {
        console.error('Error fetching match data:', err);
        toast.showError('Failed to load match data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [matchId, toast]);

  const handleRefresh = async () => {
    try {
      // Fetch updated match details
      const matchResponse = await matchService.getById(matchId!);
      setMatch(matchResponse.data);
    } catch (error) {
      console.error('Failed to refresh match data:', error);
    }
  };

  if (loading) {
    return (
      <Container>
        <Typography>Loading commentary...</Typography>
      </Container>
    );
  }

  if (error || !match) {
    return (
      <Container>
        <Typography color="error">{error || 'Match not found'}</Typography>
      </Container>
    );
  }

  return (
  <Container maxWidth="lg" sx={{ py: isMobile ? 1 : 3 }}>
      {/* Commentary Content */}
      <Box>
        <MatchCommentary match={match} onRefresh={handleRefresh} />
      </Box>
    </Container>
  );
};

export default MatchCommentaryPage;