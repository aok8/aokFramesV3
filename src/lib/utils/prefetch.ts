/**
 * Warm the browser cache for the /works hover previews.
 *
 * The covers are full-resolution (3000px) images and only appear in the desktop hover preview,
 * so they are fetched on intent (pointer or focus on a link to /works) rather than on every
 * first visit, and never on touch devices or when the visitor has asked to save data.
 */
let started = false;

export function prefetchWorkCovers(): void {
	if (started || typeof window === 'undefined') return;
	if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
	const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
	if (connection?.saveData) return;
	started = true;

	fetch('/api/works-covers')
		.then((r) => r.json())
		.then((covers: { coverImage: string }[]) => {
			covers.forEach(({ coverImage }) => {
				if (coverImage) new Image().src = coverImage;
			});
		})
		.catch(() => {
			started = false;
		});
}
