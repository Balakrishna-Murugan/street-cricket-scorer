import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Typography } from '@mui/material';

type Props = {
  open: boolean;
  onClose: () => void;
  onAllow: (reason: string) => void;
  isMobile?: boolean;
};

const BowlerChangeDialog: React.FC<Props> = ({ open, onClose, onAllow, isMobile }) => {
  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
      <DialogTitle sx={{ background: 'linear-gradient(45deg, #FF6B6B 30%, #FF5252 90%)', color: '#fff', fontWeight: 'bold' }}>
        ⚠️ Mid-Over Bowler Change
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Changing bowler mid-over should only be done in emergency situations. Please select the reason for this change:
        </Typography>
        <Stack spacing={2}>
          <Button variant="outlined" onClick={() => onAllow('Injury')} startIcon={<span>🤕</span>} fullWidth>Bowler Injury</Button>
          <Button variant="outlined" onClick={() => onAllow('Illness')} startIcon={<span>🤒</span>} fullWidth>Bowler Illness</Button>
          <Button variant="outlined" onClick={() => onAllow('Equipment Issue')} startIcon={<span>🏏</span>} fullWidth>Equipment Issue</Button>
          <Button variant="outlined" onClick={() => onAllow('Other Emergency')} startIcon={<span>⚠️</span>} fullWidth>Other Emergency</Button>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: isMobile ? 1 : 2 }}>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default BowlerChangeDialog;
