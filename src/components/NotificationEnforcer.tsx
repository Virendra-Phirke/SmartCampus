import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Bell, ShieldAlert } from 'lucide-react';
import { requestNotificationPermission } from '@/lib/notifications';

export default function NotificationEnforcer() {
  const { isSignedIn } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | 'default'>('default');
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const sync = () => setPermission(Notification.permission);
    sync();

    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);

    return () => {
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  const blocked = useMemo(() => {
    if (!isSignedIn) return false;
    if (typeof window === 'undefined') return false;
    if (!('Notification' in window)) return false;
    return permission !== 'granted';
  }, [isSignedIn, permission]);

  const handleEnable = async () => {
    try {
      setRequesting(true);
      await requestNotificationPermission();
      if ('Notification' in window) setPermission(Notification.permission);
    } finally {
      setRequesting(false);
    }
  };

  if (!blocked) return null;

  return (
    <div className="fixed inset-0 z-[2200] bg-background/96 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold">Notifications are required</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Event and alert updates are mandatory. Enable notifications to continue using the app.
            </p>
          </div>
        </div>

        {permission === 'denied' && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Notifications are blocked in browser settings. Allow notifications for this site, then tap Retry.
            </span>
          </div>
        )}

        <button
          onClick={handleEnable}
          disabled={requesting}
          className="mt-4 w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60"
        >
          {requesting ? 'Checking…' : permission === 'denied' ? 'Retry after enabling' : 'Enable notifications'}
        </button>
      </div>
    </div>
  );
}
