const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROJECT_URL') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
    // VAPID subject is a contact URI (not an email notification channel)
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'https://campusmate.app/support';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing push configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    if (!payload?.title || !payload?.body || !payload?.resourceId || !payload?.type) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const webpushModule = await import('https://esm.sh/web-push@3.6.7');
    const webpush = webpushModule.default ?? webpushModule;

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (!payload.actorUserId) {
      return new Response(JSON.stringify({ sent: 0, removed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: actorProfile, error: actorProfileError } = await admin
      .from('user_profiles')
      .select('college_id')
      .eq('clerk_user_id', payload.actorUserId)
      .maybeSingle();

    if (actorProfileError) {
      return new Response(JSON.stringify({ error: actorProfileError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const actorCollegeId = actorProfile?.college_id || null;
    if (!actorCollegeId) {
      return new Response(JSON.stringify({ sent: 0, removed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: campusUsers, error: campusUsersError } = await admin
      .from('user_profiles')
      .select('clerk_user_id, role')
      .eq('college_id', actorCollegeId)
      .neq('role', 'admin')
      .neq('clerk_user_id', payload.actorUserId);

    if (campusUsersError) {
      return new Response(JSON.stringify({ error: campusUsersError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const recipientUserIds = (campusUsers || [])
      .map((u) => u?.clerk_user_id)
      .filter(Boolean);

    if (!recipientUserIds.length) {
      return new Response(JSON.stringify({ sent: 0, removed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const query = admin
      .from('push_subscriptions')
      .select('id, user_id, subscription')
      .in('user_id', recipientUserIds);

    const { data: subs, error } = await query;
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!subs || !subs.length) {
      return new Response(JSON.stringify({ sent: 0, removed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      tag: `${payload.type}-${payload.resourceId}`,
      data: payload.type === 'event'
        ? { type: 'event', eventId: payload.resourceId }
        : { type: 'announcement', announcementId: payload.resourceId },
      requireInteraction: payload.type === 'announcement',
    });

    let sent = 0;
    const staleIds = [];

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(s.subscription, pushPayload);
          sent += 1;
        } catch (err) {
          const statusCode = err && err.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            staleIds.push(s.id);
          }
        }
      })
    );

    if (staleIds.length) {
      await admin.from('push_subscriptions').delete().in('id', staleIds);
    }

    return new Response(JSON.stringify({ sent, removed: staleIds.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e && e.message) || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
