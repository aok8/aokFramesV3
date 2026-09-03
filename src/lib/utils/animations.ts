/**
 * GSAP animation helpers for the Darkroom (v4) design system.
 *
 * All functions guard against SSR — they are safe to call from onMount
 * but must never run on the server.
 *
 * GSAP is imported dynamically so it stays out of the initial SSR bundle.
 * Every consumer should call these inside onMount() / browser checks.
 */

// ─── Clip-path scroll reveal ──────────────────────────────────────────────────
// Wipes elements up from the bottom as they enter the viewport.
// Uses ScrollTrigger.batch() so items in the same viewport row stagger together.

export async function initScrollReveal(
  selector: string,
  options: {
    stagger?: number;
    duration?: number;
    start?: string;
  } = {}
): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const { gsap } = await import('gsap');
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  gsap.registerPlugin(ScrollTrigger);

  const { stagger = 0.08, duration = 1.1, start = 'top 88%' } = options;

  // Set initial hidden state immediately so there's no flash of visible content
  gsap.set(selector, { clipPath: 'inset(100% 0% 0% 0%)' });

  ScrollTrigger.batch(selector, {
    start,
    onEnter: (batch) => {
      const readyNow: HTMLElement[] = [];

      batch.forEach((element) => {
        const el = element as HTMLElement;
        const img = el.querySelector<HTMLImageElement>('img');

        const reveal = () =>
          gsap.to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration, ease: 'power3.out' });

        // Image already in cache / decoded — animate as part of the stagger group
        if (!img || (img.complete && img.naturalHeight > 0)) {
          readyNow.push(el);
        } else {
          // Image still loading — hold the clip until it finishes, then reveal solo
          img.addEventListener('load',  reveal, { once: true });
          img.addEventListener('error', reveal, { once: true });
        }
      });

      // Fire staggered batch for elements that were already loaded
      if (readyNow.length > 0) {
        gsap.to(readyNow, {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration,
          ease: 'power3.out',
          stagger,
        });
      }
    },
    once: true,
  });
}

// ─── Simple fade-up reveal (for text / non-image elements) ────────────────────

export async function initFadeUpReveal(
  selector: string,
  options: { stagger?: number; duration?: number; y?: number } = {}
): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const { gsap } = await import('gsap');
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  gsap.registerPlugin(ScrollTrigger);

  const { stagger = 0.1, duration = 0.8, y = 24 } = options;

  gsap.set(selector, { opacity: 0, y });

  ScrollTrigger.batch(selector, {
    start: 'top 90%',
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration,
        ease: 'power2.out',
        stagger,
      }),
    once: true,
  });
}

// ─── GSAP page transition overlay ────────────────────────────────────────────
// Fades a full-screen overlay in then out around route changes.

export async function transitionOut(overlayEl: HTMLElement): Promise<void> {
  if (typeof window === 'undefined') return;
  const { gsap } = await import('gsap');
  return new Promise((resolve) => {
    gsap.fromTo(
      overlayEl,
      { opacity: 0, pointerEvents: 'all' },
      { opacity: 1, duration: 0.2, ease: 'power1.in', onComplete: resolve }
    );
  });
}

export async function transitionIn(overlayEl: HTMLElement): Promise<void> {
  if (typeof window === 'undefined') return;
  const { gsap } = await import('gsap');
  return new Promise((resolve) => {
    gsap.to(overlayEl, {
      opacity: 0,
      duration: 0.25,
      ease: 'power1.out',
      onComplete: () => {
        overlayEl.style.pointerEvents = 'none';
        resolve();
      },
    });
  });
}

// ─── Image hover parallax (subtle) ───────────────────────────────────────────
// Adds a gentle scale + brightness lift on hover for gallery items.
// Uses GSAP for smooth easing rather than CSS transitions.

export async function initImageHoverEffect(selector: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(hover: none)').matches) return;

  const { gsap } = await import('gsap');

  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    const img = el.querySelector('img');
    if (!img) return;

    el.addEventListener('mouseenter', () => {
      gsap.to(img, { scale: 1.04, filter: 'brightness(0.95) saturate(1)', duration: 0.6, ease: 'power2.out' });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(img, { scale: 1, filter: 'brightness(0.75) saturate(0.85)', duration: 0.5, ease: 'power2.inOut' });
    });
  });
}

// ─── Kill all ScrollTrigger instances (call before component unmount) ─────────

export async function killScrollTriggers(): Promise<void> {
  if (typeof window === 'undefined') return;
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  ScrollTrigger.getAll().forEach((t) => t.kill());
}
