declare const Deno: any;

// @ts-expect-error Deno npm specifier is resolved at edge runtime
import { createClient } from 'npm:@supabase/supabase-js@2';
// @ts-expect-error Deno npm specifier is resolved at edge runtime
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type PushType = 'event' | 'announcement';

interface PushRequest {
	type: PushType;
	title: string;
	body: string;
	resourceId: string;
	actorUserId?: string | null;
}

Deno.serve(async (req: Request) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { status: 200, headers: corsHeaders });
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

		const payload = (await req.json()) as PushRequest;
		if (!payload?.title || !payload?.body || !payload?.resourceId || !payload?.type) {
			return new Response(JSON.stringify({ error: 'Invalid payload' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

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
			.map((u: { clerk_user_id?: string | null }) => u.clerk_user_id)
			.filter((id: string | null | undefined): id is string => Boolean(id));

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

		if (!subs || subs.length === 0) {
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
		const staleIds: string[] = [];

		await Promise.all(
			subs.map(async (s: { id: string; subscription: unknown }) => {
				try {
					await webpush.sendNotification(s.subscription, pushPayload);
					sent += 1;
				} catch (err: any) {
					const statusCode = err?.statusCode;
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
	} catch (e: any) {
		return new Response(JSON.stringify({ error: e?.message ?? 'Unexpected error' }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
});
