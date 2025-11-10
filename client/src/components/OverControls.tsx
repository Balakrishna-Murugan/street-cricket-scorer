import React from 'react';
import { Box, Button, Tooltip, IconButton } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';

type Props = {
  isMobile: boolean;
  handleBallOutcome: (runs: number, isExtra?: boolean) => void;
  canEdit: boolean;
  isOverCompleted: boolean;
  isOverInProgress: boolean;
  isWaitingForNewBatsman: boolean;
  striker?: string;
  nonStriker?: string;
  bowler?: string;
  isMatchCompleted: boolean;
  handleWicketClick: () => void;
  handleUndo: () => void;
  canUndo: boolean;
};

const OverControls: React.FC<Props> = ({
  isMobile,
  handleBallOutcome,
  canEdit,
  isOverCompleted,
  isOverInProgress,
  isWaitingForNewBatsman,
  striker,
  nonStriker,
  bowler,
  isMatchCompleted,
  handleWicketClick,
  handleUndo,
  canUndo
}) => {
  return (
    <Box sx={{ mb: isMobile ? 1.5 : 3 }}>
      <Box 
        sx={{ 
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(8, 1fr)',
          gap: isMobile ? 0.5 : 2
        }}
      >
        {[0, 1, 2, 3, 4, 6].map((runs) => (
          <Button 
            key={runs}
            variant="contained" 
            onClick={() => handleBallOutcome(runs)}
            disabled={!canEdit || isOverCompleted || !isOverInProgress || isWaitingForNewBatsman || !striker || !nonStriker || !bowler || isMatchCompleted || (!canEdit && runs === 0)}
            sx={{
              minHeight: isMobile ? '35px' : '60px',
              borderRadius: isMobile ? '6px' : '12px',
              fontSize: isMobile ? '0.9rem' : '1.5rem',
              fontWeight: 'bold',
              background: runs === 0 
                ? 'linear-gradient(45deg, #666 30%, #999 90%)'
                : runs >= 4 
                  ? 'linear-gradient(45deg, #FF6B6B 30%, #FF5722 90%)'
                  : 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
              boxShadow: isMobile ? '0 1px 3px rgba(0,0,0,0.2)' : '0 4px 8px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: isMobile ? 'scale(0.98)' : 'translateY(-2px)',
                boxShadow: isMobile ? '0 2px 6px rgba(0,0,0,0.3)' : '0 6px 12px rgba(0,0,0,0.3)',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
              '&:disabled': {
                background: 'linear-gradient(45deg, #ccc 30%, #ddd 90%)',
                color: '#888',
              }
            }}
          >
            {runs}
          </Button>
        ))}
        <Button
          variant="contained"
          color="error"
          onClick={handleWicketClick}
          disabled={!canEdit || isOverCompleted || !isOverInProgress || isWaitingForNewBatsman || !striker || !nonStriker || !bowler || isMatchCompleted}
          sx={{
            minHeight: isMobile ? '35px' : '60px',
            borderRadius: isMobile ? '6px' : '12px',
            fontSize: isMobile ? '0.9rem' : '1.5rem',
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #f44336 30%, #d32f2f 90%)',
            boxShadow: isMobile ? '0 1px 3px rgba(244, 67, 54, 0.3)' : '0 4px 8px rgba(244, 67, 54, 0.3)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: isMobile ? 'scale(0.98)' : 'translateY(-2px)',
              boxShadow: isMobile ? '0 2px 6px rgba(244, 67, 54, 0.4)' : '0 6px 12px rgba(244, 67, 54, 0.4)',
              background: 'linear-gradient(45deg, #d32f2f 30%, #b71c1c 90%)',
            },
            '&:active': {
              transform: 'translateY(0)',
            }
          }}
        >
          W
        </Button>
        <Tooltip title={canUndo ? "Undo last action" : "No actions to undo"}>
          <span>
            <IconButton
              onClick={handleUndo}
              disabled={!canUndo || !canEdit || isMatchCompleted}
              sx={{
                minWidth: isMobile ? '35px' : '60px',
                minHeight: isMobile ? '35px' : '60px',
                borderRadius: isMobile ? '6px' : '12px',
                background: canUndo ? 'linear-gradient(45deg, #FF9800 30%, #F57C00 90%)' : 'rgba(255, 255, 255, 0.1)',
                color: canUndo ? '#fff' : '#ccc',
                border: canUndo ? '2px solid #FF9800' : '2px solid #ccc',
                boxShadow: canUndo ? '0 4px 12px rgba(255, 152, 0, 0.4)' : 'none',
                transition: 'all 0.3s ease',
                '&:hover': canUndo ? {
                  background: 'linear-gradient(45deg, #F57C00 30%, #EF6C00 90%)',
                  transform: isMobile ? 'scale(0.98)' : 'translateY(-2px)',
                  boxShadow: isMobile ? '0 2px 6px rgba(255, 152, 0, 0.5)' : '0 6px 16px rgba(255, 152, 0, 0.5)',
                } : {},
                '&:disabled': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ccc',
                  border: '2px solid #ccc',
                }
              }}
            >
              <UndoIcon sx={{ fontSize: isMobile ? '1.2rem' : '1.8rem' }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default OverControls;
