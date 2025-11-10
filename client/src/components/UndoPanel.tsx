import React from 'react';

type Props = {
  undoHistory: any[];
  canUndo: boolean;
  onUndo: () => void;
  isMobile?: boolean;
};

const UndoPanel: React.FC<Props> = () => {
  // This component previously displayed recent actions and an Undo button.
  // Per product request, we no longer show the recent actions list or a duplicate
  // Undo button here — the main Undo control is provided by `OverControls`.
  // Keep the component as a no-op so existing imports/usages remain valid.
  return null;
};

export default UndoPanel;
