import { useContext } from 'react';
import { DialogContext } from '@/contexts/appDialogContext';

export const useAppDialog = () => {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useAppDialog must be used within AppDialogProvider');
  }
  return ctx;
};
