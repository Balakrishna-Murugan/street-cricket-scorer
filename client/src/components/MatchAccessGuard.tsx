import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { CircularProgress, Box, Typography } from '@mui/material';
import { matchService } from '../services/api.service';

const MatchAccessGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { matchId } = useParams();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!matchId) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      try {
        const res = await matchService.getById(matchId);
        const match = res.data;

        const userData = localStorage.getItem('user');
        const currentUserId = userData ? JSON.parse(userData)._id : null;
        const userRole = localStorage.getItem('userRole') || 'viewer';

        if (userRole === 'admin' || userRole === 'superadmin') {
          setAllowed(true);
        } else if (match && match.createdBy && currentUserId && String(match.createdBy) === String(currentUserId)) {
          // allow match creator (player/viewer) to access live scoring
          setAllowed(true);
        } else {
          setAllowed(false);
        }
      } catch (error) {
        console.error('MatchAccessGuard: error checking match access', error);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [matchId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Checking access...</Typography>
      </Box>
    );
  }

  if (!allowed) {
    // Redirect unauthorized users back to matches list
    return <Navigate to="/matches" replace />;
  }

  return <>{children}</>;
};

export default MatchAccessGuard;
