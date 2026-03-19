import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DialogContext, type DialogOptions, type DialogState } from '@/contexts/appDialogContext';

const defaultState: DialogState = {
  open: false,
  mode: 'confirm',
  title: '',
  description: '',
  confirmText: 'OK',
  cancelText: 'Cancel',
  destructive: false,
};

export const AppDialogProvider = ({ children }: { children: ReactNode }) => {
  const [dialog, setDialog] = useState<DialogState>(defaultState);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const closeDialog = useCallback((result: boolean) => {
    setDialog((prev) => ({ ...prev, open: false }));
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  const confirm = useCallback((options: DialogOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        open: true,
        mode: 'confirm',
        title: options.title || 'Please confirm',
        description: options.description || '',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        destructive: !!options.destructive,
      });
    });
  }, []);

  const alert = useCallback((options: DialogOptions) => {
    return new Promise<void>((resolve) => {
      resolverRef.current = () => resolve();
      setDialog({
        open: true,
        mode: 'alert',
        title: options.title || 'Notice',
        description: options.description || '',
        confirmText: options.confirmText || 'OK',
        cancelText: options.cancelText || 'Close',
        destructive: !!options.destructive,
      });
    });
  }, []);

  const value = useMemo(() => ({ confirm, alert }), [confirm, alert]);

  return (
    <DialogContext.Provider value={value}>
      {children}

      <AlertDialog
        open={dialog.open}
        onOpenChange={(open) => {
          if (!open) closeDialog(false);
        }}
      >
        <AlertDialogContent className="w-[calc(100vw-24px)] max-w-md rounded-2xl border-border bg-card p-4 sm:p-5">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-base sm:text-lg font-bold font-heading">
              {dialog.title}
            </AlertDialogTitle>
            {dialog.description ? (
              <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {dialog.description}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-2 flex-col-reverse sm:flex-row gap-2 sm:gap-2">
            {dialog.mode === 'confirm' ? (
              <AlertDialogCancel
                className="h-11 rounded-xl border-border text-sm font-medium"
                onClick={() => closeDialog(false)}
              >
                {dialog.cancelText}
              </AlertDialogCancel>
            ) : null}

            <AlertDialogAction
              className={`h-11 rounded-xl text-sm font-semibold ${dialog.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}`}
              onClick={() => closeDialog(true)}
            >
              {dialog.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogContext.Provider>
  );
};

