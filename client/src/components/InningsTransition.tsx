import React from 'react';
import { Box, Paper, Typography, Button, Stack } from '@mui/material';

interface Props {
  title: string;
  message?: string;
  matchId?: string | null;
  primaryLabel?: string;
  onPrimary?: () => void;
  onClose?: () => void;
  isMobile?: boolean;
  // Accept children for richer content (details panel)
  children?: React.ReactNode;
}

const InningsTransition: React.FC<Props> = ({ title, message, matchId, primaryLabel, onPrimary, onClose, isMobile, children }) => {
  return (
    <Box sx={{ maxWidth: 'lg', py: isMobile ? 1 : 3, px: isMobile ? 1 : 3, mx: 'auto' }}>
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3e6cb 100%)', p: isMobile ? 1 : 3 }}>
        <Paper elevation={6} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ mb: 3, color: '#2c3e50', fontWeight: 'bold' }}>{title}</Typography>

          {message && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#444' }}>{message}</Typography>
            </Box>
          )}

          {/* Render richer content if provided */}
          {children && (
            <Box sx={{ mb: 3, textAlign: 'left' }}>
              {children}
            </Box>
          )}

          <Stack direction={isMobile ? 'column' : 'row'} spacing={2} justifyContent="center">
            {onPrimary && (
              <Button variant="contained" onClick={onPrimary}>
                {primaryLabel || 'Continue'}
              </Button>
            )}
            {onClose && (
              <Button variant="outlined" onClick={onClose}>Close</Button>
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};

export default InningsTransition;
