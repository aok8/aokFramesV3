/**
 * Svelte action: fade-and-settle an element in the first time it scrolls into view.
 *
 * Content stays visible until the client has hydrated, and elements already on
 * screen are left alone, so a failed script or slow connection never hides copy.
 */
export function reveal(
	node: HTMLElement,
	options: { delay?: number; y?: number; duration?: number } = {}
) {
	if (typeof window === 'undefined') return {};
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return {};

	const { delay = 0, y = 18, duration = 800 } = options;
	const rect = node.getBoundingClientRect();
	if (rect.top < window.innerHeight * 0.92) return {};

	node.style.opacity = '0';
	let anim: Animation | undefined;

	const io = new IntersectionObserver(
		([entry]) => {
			if (!entry.isIntersecting) return;
			io.disconnect();
			anim = node.animate(
				[
					{ opacity: 0, transform: `translateY(${y}px)` },
					{ opacity: 1, transform: 'translateY(0)' }
				],
				{ duration, delay, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' }
			);
			node.style.opacity = '';
		},
		{ rootMargin: '0px 0px -8% 0px' }
	);
	io.observe(node);

	return {
		destroy() {
			io.disconnect();
			anim?.cancel();
			node.style.opacity = '';
		}
	};
}
