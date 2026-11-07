<script lang="ts">
	import { tick } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { contactDrawer, CONTACT_EMAIL, type InquiryTopic } from '$lib/stores/contact.js';

	const TOPICS: { value: InquiryTopic; label: string }[] = [
		{ value: 'Print', label: 'A print' },
		{ value: 'Commission', label: 'Commission' },
		{ value: 'Collaboration', label: 'Collaboration' },
		{ value: 'Hello', label: 'Just hello' }
	];

	const siteKey = env.PUBLIC_TURNSTILE_SITE_KEY ?? '';

	let topic = $state<InquiryTopic>('Hello');
	let name = $state('');
	let email = $state('');
	let message = $state('');
	let company = $state(''); // honeypot: people never see or fill this
	let status = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let errorText = $state('');
	let copied = $state(false);

	let panelEl = $state<HTMLElement | null>(null);
	let turnstileEl = $state<HTMLDivElement | null>(null);
	let turnstileToken = '';
	let widgetId: string | undefined;
	let returnFocus: HTMLElement | null = null;

	const open = $derived($contactDrawer !== null);

	// Prefilled mail for the fallback path, so nothing the visitor typed is lost.
	const mailtoHref = $derived(
		`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${topic === 'Hello' ? 'Hello' : topic + ' inquiry'} from aokframes.com`)}&body=${encodeURIComponent(message)}`
	);

	$effect(() => {
		if (!open) return;
		topic = $contactDrawer ?? 'Hello';
		status = 'idle';
		returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		document.body.style.overflow = 'hidden';
		tick().then(() => {
			panelEl?.querySelector<HTMLInputElement>('input[name="topic"]:checked')?.focus();
			mountTurnstile();
		});
		return () => {
			document.body.style.overflow = '';
		};
	});

	function close() {
		contactDrawer.set(null);
		const target = returnFocus;
		returnFocus = null;
		tick().then(() => target?.focus());
	}

	// ── Cloudflare Turnstile (free, mostly invisible spam check) ───────────────
	// Only loaded when the drawer opens and a site key is configured.
	function loadTurnstile(): Promise<any> {
		const w = window as any;
		if (w.turnstile) return Promise.resolve(w.turnstile);
		return new Promise((resolve, reject) => {
			const s = document.createElement('script');
			s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
			s.async = true;
			s.onload = () => resolve(w.turnstile);
			s.onerror = reject;
			document.head.appendChild(s);
		});
	}

	async function mountTurnstile() {
		if (!siteKey || !turnstileEl || widgetId) return;
		try {
			const ts = await loadTurnstile();
			widgetId = ts.render(turnstileEl, {
				sitekey: siteKey,
				theme: 'dark',
				appearance: 'interaction-only',
				callback: (token: string) => (turnstileToken = token),
				'expired-callback': () => (turnstileToken = '')
			});
		} catch {
			// If the check can't load, the server decides; the email fallback is always shown on failure.
		}
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		errorText = '';
		if (!name.trim() || !email.trim() || !message.trim()) {
			errorText = 'Please add your name, your email and a message.';
			return;
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			errorText = 'That email address looks incomplete. Check it so Alain can reply.';
			return;
		}
		status = 'sending';
		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ topic, name, email, message, company, token: turnstileToken })
			});
			if (!res.ok) throw new Error(String(res.status));
			status = 'sent';
			message = '';
		} catch {
			status = 'error';
		} finally {
			const ts = (window as any).turnstile;
			if (ts && widgetId) ts.reset(widgetId);
			turnstileToken = '';
		}
	}

	async function copyEmail() {
		try {
			await navigator.clipboard.writeText(CONTACT_EMAIL);
			copied = true;
			setTimeout(() => (copied = false), 2200);
		} catch {
			// Clipboard blocked: the address is selectable text right beside the button.
		}
	}

	function trap(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			close();
			return;
		}
		if (e.key !== 'Tab' || !panelEl) return;
		const f = Array.from(
			panelEl.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([tabindex="-1"]), textarea, iframe')
		).filter((el) => el.offsetParent !== null);
		if (!f.length) return;
		const first = f[0];
		const last = f[f.length - 1];
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}
</script>

<div class="scrim" class:open aria-hidden="true" onclick={close}></div>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_no_static_element_interactions -->
<div
	class="drawer"
	class:open
	bind:this={panelEl}
	role="dialog"
	aria-modal="true"
	aria-labelledby="contact-title"
	tabindex="-1"
	inert={!open}
	onkeydown={trap}
>
	<button type="button" class="close" onclick={close}>Close</button>

	{#if status === 'sent'}
		<div class="done" role="status">
			<p class="kicker">Sent</p>
			<h2 id="contact-title">Thanks, {name.trim().split(' ')[0] || 'there'}.</h2>
			<p>Your note is with Alain. He replies from {CONTACT_EMAIL}, usually within a few days.</p>
			<button type="button" class="ghost" onclick={close}>Back to the photographs</button>
		</div>
	{:else}
		<form onsubmit={submit} novalidate>
			<h2 id="contact-title">Say hello</h2>

			<fieldset class="topics">
				<legend>What's it about</legend>
				<div class="topic-row">
					{#each TOPICS as t}
						<label>
							<input type="radio" name="topic" value={t.value} bind:group={topic} id={`topic-${t.value}`} />
							<span>{t.label}</span>
						</label>
					{/each}
				</div>
			</fieldset>

			<div class="field">
				<label for="contact-name">Name</label>
				<input id="contact-name" autocomplete="name" bind:value={name} required />
			</div>
			<div class="field">
				<label for="contact-email">Email</label>
				<input id="contact-email" type="email" autocomplete="email" bind:value={email} required />
			</div>
			<div class="field">
				<label for="contact-message">Message</label>
				<textarea id="contact-message" rows="5" bind:value={message} required maxlength="5000"></textarea>
			</div>

			<!-- Honeypot: hidden from people and assistive tech; bots tend to fill it -->
			<div class="hp" aria-hidden="true">
				<label for="contact-company">Company</label>
				<input id="contact-company" tabindex="-1" autocomplete="off" bind:value={company} />
			</div>

			{#if siteKey}
				<div class="turnstile" bind:this={turnstileEl}></div>
			{/if}

			{#if errorText}
				<p class="error" role="alert">{errorText}</p>
			{/if}

			{#if status === 'error'}
				<p class="error" role="alert">
					The message couldn't be sent from the site. <a href={mailtoHref}>Open it in your email app</a>
					instead, or copy the address below.
				</p>
			{/if}

			<button type="submit" class="send" disabled={status === 'sending'}>
				{status === 'sending' ? 'Sending…' : 'Send message'}
			</button>
		</form>
	{/if}

	<div class="direct">
		<span>Prefer your own mail app?</span>
		<span class="pill">
			<span class="addr">{CONTACT_EMAIL}</span>
			<button type="button" onclick={copyEmail}>{copied ? 'Copied' : 'Copy'}</button>
		</span>
		<span class="visually-hidden" role="status">{copied ? 'Email address copied' : ''}</span>
	</div>
</div>

<style>
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 1100;
		background: rgba(8, 8, 8, 0.6);
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.4s ease;
	}
	.scrim.open {
		opacity: 1;
		pointer-events: auto;
	}

	.drawer {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 1101;
		width: min(100%, 460px);
		overflow-y: auto;
		overscroll-behavior: contain;
		background: var(--near-black, #0e0e0e);
		border-left: 1px solid rgba(200, 192, 184, 0.12);
		padding: 4.5rem 2rem 2rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
		transform: translateX(102%);
		visibility: hidden;
		transition:
			transform 0.55s cubic-bezier(0.16, 1, 0.3, 1),
			visibility 0s linear 0.55s;
	}
	.drawer.open {
		transform: none;
		visibility: visible;
		transition:
			transform 0.55s cubic-bezier(0.16, 1, 0.3, 1),
			visibility 0s;
	}

	.close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		padding: 14px 10px;
		font-family: var(--font-ui);
		font-size: 12px;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: var(--text-dim, rgba(200, 192, 184, 0.7));
	}
	.close:hover {
		color: var(--warm-white);
	}

	h2 {
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 300;
		font-size: 2.6rem;
		line-height: 1;
		margin: 0;
		color: var(--warm-white);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1.4rem;
	}

	.topics {
		border: 0;
		padding: 0;
		margin: 0;
	}
	legend,
	.field label,
	.kicker {
		font-family: var(--font-ui);
		font-size: 12px;
		letter-spacing: 0.25em;
		text-transform: uppercase;
		color: var(--text-dim, rgba(200, 192, 184, 0.7));
		margin: 0 0 0.6rem;
		padding: 0;
	}
	.topic-row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.topic-row label {
		position: relative;
	}
	.topic-row input {
		position: absolute;
		inset: 0;
		opacity: 0;
		margin: 0;
		cursor: pointer;
	}
	.topic-row span {
		display: inline-block;
		padding: 11px 13px;
		font-family: var(--font-ui);
		font-size: 12px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--silver);
		border: 1px solid rgba(200, 192, 184, 0.2);
		transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
	}
	.topic-row input:checked + span {
		color: var(--near-black);
		background: var(--warm-white);
		border-color: var(--warm-white);
	}
	.topic-row input:focus-visible + span {
		outline: 2px solid var(--gold);
		outline-offset: 2px;
	}

	.field {
		display: flex;
		flex-direction: column;
	}
	.field input,
	.field textarea {
		font: inherit;
		font-size: 16px;
		color: var(--warm-white);
		background: transparent;
		border: 0;
		border-bottom: 1px solid rgba(200, 192, 184, 0.25);
		border-radius: 0;
		padding: 0.5rem 0;
		transition: border-color 0.25s ease;
	}
	.field textarea {
		font-family: var(--font-display);
		font-size: 1.15rem;
		line-height: 1.5;
		resize: vertical;
	}
	.field input:focus,
	.field textarea:focus {
		outline: none;
		border-bottom-color: var(--gold);
	}

	.hp {
		position: absolute;
		left: -10000px;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}

	.error {
		margin: 0;
		font-size: 14px;
		line-height: 1.6;
		color: #e2b4a4;
	}
	.error a {
		color: var(--warm-white);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.send,
	.ghost {
		font-family: var(--font-ui);
		font-size: 12px;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		padding: 16px;
		transition: opacity 0.2s ease, background-color 0.2s ease, color 0.2s ease;
	}
	.send {
		color: var(--near-black);
		background: var(--green-lit, #86ad93);
	}
	.send:disabled {
		opacity: 0.6;
		cursor: progress;
	}
	.ghost {
		align-self: flex-start;
		color: var(--warm-white);
		border: 1px solid rgba(240, 235, 227, 0.4);
	}

	.done {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.done p:not(.kicker) {
		margin: 0;
		color: var(--silver);
		line-height: 1.7;
	}

	.direct {
		margin-top: auto;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		font-size: 13px;
		color: var(--text-dim, rgba(200, 192, 184, 0.7));
	}
	.pill {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border: 1px solid rgba(200, 192, 184, 0.2);
		padding: 6px 6px 6px 14px;
		color: var(--warm-white);
	}
	.addr {
		user-select: all;
		letter-spacing: 0.03em;
		overflow-wrap: anywhere;
	}
	.pill button {
		flex-shrink: 0;
		font-family: var(--font-ui);
		font-size: 11px;
		letter-spacing: 0.25em;
		text-transform: uppercase;
		color: var(--near-black);
		background: var(--warm-white);
		padding: 10px 12px;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	@media (max-width: 520px) {
		.drawer {
			padding: 4rem 1.25rem 1.5rem;
		}
	}
</style>
