import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Alert, AlertTitle, Autocomplete, TextField, Button } from '@mui/material';
import { Match, Player } from '../types';
import { SelectChangeEvent } from '@mui/material/Select';

interface Props {
  open: boolean;
  onClose: () => void; // close dialog without disabling auto-popup
  onCancelDontShow: () => void; // cancel & don't show again
  onCloseOnly: () => void; // close only
  onContinue: () => void; // continue handler (heavy logic lives in LiveScoring)
  getDialogContext: () => any;
  players: Player[];
  match: Match | null;
  currentInnings: number;
  striker: string;
  nonStriker: string;
  bowler: string;
  changePlayerType: 'striker' | 'nonStriker' | 'bowler' | null;
  isMobile: boolean;
  showInsufficientBatsmenAlert: boolean;
  setShowInsufficientBatsmenAlert: (v: boolean) => void;
  getAvailableBatsmen: () => Player[];
  areRequiredSelectionsComplete: () => boolean;
  handleBatsmanChange: (e: any) => void;
  handleNonStrikerChange: (e: any) => void;
  handleBowlerChange: (e: any) => void;
  handleBowlerPendingChange?: (id: string) => void;
  isOverCompleted?: boolean;
  isWaitingForNewBatsman?: boolean;
}

const PlayerSelectionDialog: React.FC<Props> = (props) => {
  const {
    open,
    onClose,
    onCancelDontShow,
    onCloseOnly,
    onContinue,
    getDialogContext,
    players,
    match,
    currentInnings,
    striker,
    nonStriker,
    bowler,
    changePlayerType,
    isMobile,
    showInsufficientBatsmenAlert,
    setShowInsufficientBatsmenAlert,
    getAvailableBatsmen,
    areRequiredSelectionsComplete,
    handleBatsmanChange,
    handleNonStrikerChange,
    handleBowlerChange
    ,isOverCompleted, isWaitingForNewBatsman
  } = props;

  const dialogContext = getDialogContext();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{ '& .MuiDialog-paper': { borderRadius: '16px', background: 'white', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' } }}
    >
      <DialogTitle sx={{ background: dialogContext.gradientColor, color: '#fff', fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.3)', borderRadius: '16px 16px 0 0' }}>
        {dialogContext.title}
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Typography variant="body2" sx={{ mb: 3, color: 'text.primary', fontWeight: 500 }}>{dialogContext.message}</Typography>

        {/* Insufficient batsmen warning */}
        {(() => {
          const availableBatsmen = getAvailableBatsmen();
          if (availableBatsmen.length < 2 && showInsufficientBatsmenAlert) {
            return (
              <Alert severity="warning" onClose={() => setShowInsufficientBatsmenAlert(false)} sx={{ mb: 3, borderRadius: 2 }}>
                <AlertTitle sx={{ fontWeight: 'bold' }}>⚠️ Insufficient Batsmen</AlertTitle>
                Only {availableBatsmen.length} available batsmen found. Need at least 2 to continue the match.
                {availableBatsmen.length === 0 && ' This innings will be skipped.'}
                {availableBatsmen.length === 1 && ' The match may end after the next wicket.'}
              </Alert>
            );
          }
          return null;
        })()}

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3 }}>
          {/* Striker */}
          {(!dialogContext.showOnlyBowler && !(dialogContext as any).showOnlyNonStriker) || dialogContext.showOnlyStriker ? (
            <Autocomplete
              fullWidth
              options={players.filter(player => {
                if (!player.teams || !Array.isArray(player.teams) || !match?.innings?.[currentInnings]?.battingTeam) return false;
                const battingTeam = match!.innings[currentInnings].battingTeam;
                const battingTeamId = typeof battingTeam === 'object' ? (battingTeam as any)._id : battingTeam;
                const hasTeam = player.teams.some(team => { const teamId = typeof team === 'string' ? team : (team as any)._id; return teamId === String(battingTeamId); });
                const currentInning = match!.innings[currentInnings];
                const isPlayerOut = currentInning?.battingStats?.some(stat => { const playerId = typeof stat.player === 'string' ? stat.player : (stat.player as any)._id; return playerId === player._id && stat.isOut; });
                const isSameAsNonStriker = player._id === nonStriker;
                const isSameAsStriker = player._id === striker && changePlayerType === 'striker';
                return hasTeam && !isPlayerOut && !isSameAsNonStriker && !isSameAsStriker;
              })}
              getOptionLabel={(option) => option.name}
              value={players.find(p => p._id === striker) || null}
              onChange={(event, newValue) => { if (newValue && newValue._id) handleBatsmanChange({ target: { value: newValue._id } } as SelectChangeEvent); }}
              renderInput={(params) => <TextField {...params} label="Striker" />}
              renderOption={(props, option) => <Box component="li" {...props}><Typography>{option.name}</Typography></Box>}
            />
          ) : null}

          {/* Non-Striker */}
          {(!dialogContext.showOnlyBowler && !dialogContext.showOnlyStriker) || (dialogContext as any).showOnlyNonStriker ? (
            <Autocomplete
              fullWidth
              options={players.filter(player => {
                if (!player.teams || !Array.isArray(player.teams) || !match?.innings?.[currentInnings]?.battingTeam) return false;
                const battingTeam = match!.innings[currentInnings].battingTeam;
                const battingTeamId = typeof battingTeam === 'object' ? (battingTeam as any)._id : battingTeam;
                const hasTeam = player.teams.some(team => { const teamId = typeof team === 'string' ? team : (team as any)._id; return teamId === String(battingTeamId); });
                const currentInning = match!.innings[currentInnings];
                const isPlayerOut = currentInning?.battingStats?.some(stat => { const playerId = typeof stat.player === 'string' ? stat.player : (stat.player as any)._id; return playerId === player._id && stat.isOut; });
                const isSameAsStriker = player._id === striker;
                const isSameAsNonStriker = player._id === nonStriker && changePlayerType === 'nonStriker';
                return hasTeam && !isPlayerOut && !isSameAsStriker && !isSameAsNonStriker;
              })}
              getOptionLabel={(option) => option.name}
              value={players.find(p => p._id === nonStriker) || null}
              onChange={(event, newValue) => { if (newValue && newValue._id) handleNonStrikerChange({ target: { value: newValue._id } } as SelectChangeEvent); }}
              renderInput={(params) => <TextField {...params} label="Non-Striker" />}
              renderOption={(props, option) => <Box component="li" {...props}><Typography>{option.name}</Typography></Box>}
            />
          ) : null}

          {/* Bowler */}
          {(!dialogContext.showOnlyStriker && !(dialogContext as any).showOnlyNonStriker) || dialogContext.showOnlyBowler ? (
            <Autocomplete
              fullWidth
              options={players.filter(player => {
                if (!player.teams || !Array.isArray(player.teams) || !match?.innings?.[currentInnings]?.bowlingTeam) return false;
                const bowlingTeam = match!.innings[currentInnings].bowlingTeam;
                const bowlingTeamId = typeof bowlingTeam === 'object' ? (bowlingTeam as any)._id : bowlingTeam;
                const hasTeam = player.teams.some(team => { const teamId = typeof team === 'string' ? team : (team as any)._id; return teamId === String(bowlingTeamId); });
                const isSameAsBowler = player._id === bowler && (match?.status !== 'upcoming' || false || changePlayerType === 'bowler');
                return hasTeam && !isSameAsBowler;
              })}
              getOptionLabel={(option) => option.name}
              value={players.find(p => p._id === bowler) || null}
              onChange={(event, newValue) => { if (newValue && newValue._id) handleBowlerChange({ target: { value: newValue._id } } as SelectChangeEvent); }}
              renderInput={(params) => <TextField {...params} label="Bowler" />}
              renderOption={(props, option) => <Box component="li" {...props}><Typography>{option.name}</Typography></Box>}
            />
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: isMobile ? 1 : 3, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 1 : 0, '& > button': { width: isMobile ? '100%' : 'auto', minWidth: isMobile ? '100%' : 'auto' } }}>
        <Button onClick={onCancelDontShow} variant="outlined" sx={{ mr: isMobile ? 0 : 2, borderRadius: '8px', fontWeight: 'bold', fontSize: isMobile ? '0.75rem' : '0.875rem', py: isMobile ? 1 : 1.5, borderColor: '#FF5722', color: '#FF5722', background: 'linear-gradient(45deg, rgba(255, 87, 34, 0.1) 30%, rgba(244, 67, 54, 0.1) 90%)', '&:hover': { background: 'linear-gradient(45deg, #FF5722 30%, #f44336 90%)', borderColor: '#f44336', color: '#fff', transform: 'translateY(-1px)', boxShadow: '0 4px 8px rgba(255, 87, 34, 0.3)' } }}>
          {isMobile ? '🚫 Don\'t Show Again' : 'Cancel & Don\'t Show Again'}
        </Button>
        <Button onClick={onCloseOnly} sx={{ mr: isMobile ? 0 : 2, borderRadius: '8px', fontWeight: 'bold', fontSize: isMobile ? '0.75rem' : '0.875rem', py: isMobile ? 1 : 1.5 }}>Close</Button>
        <Button variant="contained" onClick={onContinue} disabled={!areRequiredSelectionsComplete()} sx={{ borderRadius: '8px', fontWeight: 'bold', fontSize: isMobile ? '0.75rem' : '0.875rem', py: isMobile ? 1 : 1.5, background: areRequiredSelectionsComplete() ? 'linear-gradient(45deg, #4CAF50 30%, #66BB6A 90%)' : undefined, '&:hover': areRequiredSelectionsComplete() ? { background: 'linear-gradient(45deg, #388E3C 30%, #4CAF50 90%)', transform: 'translateY(-1px)', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' } : undefined, '&:disabled': { background: '#ccc' } }}>
          {isMobile ? (changePlayerType ? `🔄 ${changePlayerType === 'striker' ? 'Striker' : changePlayerType === 'nonStriker' ? 'Non-Striker' : 'Bowler'}` : isOverCompleted ? '🎯 New Bowler' : isWaitingForNewBatsman ? '🏏 New Batsman' : '🚀 Start') : (changePlayerType ? `🔄 Change ${changePlayerType === 'striker' ? 'Striker' : changePlayerType === 'nonStriker' ? 'Non-Striker' : 'Bowler'}` : isOverCompleted ? '🎯 Continue with New Bowler' : isWaitingForNewBatsman ? '🏏 Continue with New Batsman' : '🚀 Start Match')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlayerSelectionDialog;
