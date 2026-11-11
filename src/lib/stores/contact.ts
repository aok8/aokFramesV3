import { writable } from 'svelte/store';

export const CONTACT_EMAIL = 'aokframes@gmail.com';

export type InquiryTopic = 'Print' | 'Commission' | 'Collaboration' | 'Hello';

/** null = closed; otherwise the topic the drawer opens on. */
export const contactDrawer = writable<InquiryTopic | null>(null);

/**
 * Open the inquiry drawer. Use as a click handler on a mailto: link so the link still works
 * as a plain email link before the app has loaded.
 */
export function openContact(topic: InquiryTopic = 'Hello') {
	return (event?: Event) => {
		event?.preventDefault();
		contactDrawer.set(topic);
	};
}
