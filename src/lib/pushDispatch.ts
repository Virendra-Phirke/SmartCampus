import { supabase } from '@/lib/supabase';

type PushType = 'event' | 'announcement';

interface PushDispatchInput {
  type: PushType;
  title: string;
  body: string;
  resourceId: string;
  actorUserId?: string | null;
}

export async function dispatchBackgroundPush(input: PushDispatchInput): Promise<void> {
  if (!input?.resourceId) return;

  // Force-enable for real deployments; keep localhost quiet unless explicitly opted in.
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const localHost = host === 'localhost' || host === '127.0.0.1';
  const localOptIn = String(import.meta.env.VITE_ENABLE_SERVER_PUSH || '').toLowerCase() === 'true';
  if (localHost && !localOptIn) return;

  try {
    const { error } = await supabase.functions.invoke('send-push', {
      body: {
        type: input.type,
        title: input.title,
        body: input.body,
        resourceId: input.resourceId,
        actorUserId: input.actorUserId ?? null,
      },
    });

    if (error) {
      console.warn('Push dispatch failed:', error.message || error);
    }
  } catch (err) {
    console.warn('Push dispatch error (non-blocking):', err);
  }
}
