import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

/**
 * Inquiry form → Alain's inbox, without a paid email provider.
 *
 * Delivery uses Cloudflare's `send_email` binding (named CONTACT_EMAIL). Sending to your own
 * verified destination address is free on every Cloudflare plan. Setup is described in
 * CONTACT_SETUP.md. Until the binding exists this route answers 503, and the drawer offers the
 * visitor a prefilled email and the address to copy instead, so no inquiry is lost.
 *
 * Spam: a honeypot field, size limits, and Cloudflare Turnstile when TURNSTILE_SECRET_KEY is set.
 */

const TO = 'aokframes@gmail.com';
const TOPICS = new Set(['Print', 'Commission', 'Collaboration', 'Hello']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SendEmailBinding {
	send(message: {
		to: string;
		from: string | { email: string; name?: string };
		subject: string;
		text: string;
		replyTo?: string;
	}): Promise<unknown>;
}

export const POST: RequestHandler = async ({ request, platform, getClientAddress }) => {
	const env = ((platform as any)?.env ?? {}) as {
		CONTACT_EMAIL?: SendEmailBinding;
		CONTACT_FROM?: string;
		TURNSTILE_SECRET_KEY?: string;
	};

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request' }, { status: 400 });
	}

	const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
	const topic = TOPICS.has(String(body.topic)) ? String(body.topic) : 'Hello';
	const name = str(body.name, 120);
	const email = str(body.email, 200);
	const message = str(body.message, 5000);

	// Honeypot filled: pretend it worked so bots learn nothing.
	if (str(body.company, 200)) return json({ ok: true });

	if (!name || !message || !EMAIL_RE.test(email)) {
		return json({ error: 'Name, a valid email and a message are required' }, { status: 400 });
	}

	if (env.TURNSTILE_SECRET_KEY) {
		const form = new FormData();
		form.append('secret', env.TURNSTILE_SECRET_KEY);
		form.append('response', str(body.token, 2048));
		try {
			form.append('remoteip', getClientAddress());
		} catch {
			// not available in every runtime
		}
		const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			body: form
		})
			.then((r) => r.json() as Promise<{ success?: boolean }>)
			.catch(() => ({ success: false }));
		if (!verify.success) return json({ error: 'Spam check failed' }, { status: 403 });
	}

	if (!env.CONTACT_EMAIL) {
		return json({ error: 'Email delivery is not configured' }, { status: 503 });
	}

	const subject = topic === 'Hello' ? `Hello from ${name}` : `${topic} inquiry from ${name}`;
	const text = [
		`${name} <${email}> wrote via aokframes.com`,
		`Topic: ${topic}`,
		'',
		message,
		'',
		'Reply to this email to answer them directly.'
	].join('\n');

	try {
		await env.CONTACT_EMAIL.send({
			to: TO,
			from: { email: env.CONTACT_FROM || 'inquiries@aokframes.com', name: 'AOKFrames website' },
			subject,
			text,
			replyTo: email
		});
		return json({ ok: true });
	} catch (err) {
		console.error('[contact] send failed', err);
		return json({ error: 'Could not send' }, { status: 502 });
	}
};
