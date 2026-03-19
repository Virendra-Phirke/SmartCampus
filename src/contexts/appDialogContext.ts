import { createContext } from 'react';

export type DialogOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

export type DialogContextValue = {
  confirm: (options: DialogOptions) => Promise<boolean>;
  alert: (options: DialogOptions) => Promise<void>;
};

export type DialogMode = 'confirm' | 'alert';

export type DialogState = {
  open: boolean;
  mode: DialogMode;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  destructive: boolean;
};

export const DialogContext = createContext<DialogContextValue | null>(null);
