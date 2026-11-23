/* ------------------------------------------------------------------
   Site-wide motion
   - Lenis smooth scrolling (also handles nav anchor jumps)
   - [data-split]   headings reveal line by line from a mask
   - [data-reveal]  blocks fade up as they enter (children stagger
                    when the element has data-reveal="stagger")
   - [data-timeline] its [data-timeline-fill] line draws with scroll
   Nothing is hidden before JS runs, and reduced motion skips all of it.
------------------------------------------------------------------- */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Wait for the hero intro (or 3s at most) plus a beat, so setup work never stutters it
const afterIntro = new Promise<void>((resolve) => {
  const go = () => setTimeout(resolve, 1100);
  if (document.documentElement.classList.contains('intro-done')) go();
  else {
    addEventListener('intro:done', go, { once: true });
    // fallback, counted from the enter-screen press rather than page load
    if (document.documentElement.dataset.boot === 'gate')
      addEventListener('boot:start', () => setTimeout(resolve, 3000), { once: true });
    else setTimeout(resolve, 3000);
  }
});

if (!reduce) {
  gsap.registerPlugin(ScrollTrigger, SplitText);

  /* Smooth scroll, driven by GSAP's ticker so ScrollTrigger stays in sync */
  const lenis = new Lenis({
    lerp: 0.12,
    anchors: { offset: -72 },
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  afterIntro.then(() => {
    /* Fade-up blocks */
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      const stagger = el.dataset.reveal === 'stagger';
      gsap.from(stagger ? el.children : el, {
        y: 28,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: stagger ? 0.08 : 0,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      });
    });

    /* Scene 1: as you leave the hero, the photo drifts up slower than the page and the copy
       steps back. Transform/opacity only (no pinning, no layout work) so scrolling stays smooth. */
    const hero = document.querySelector<HTMLElement>('[data-hero]');
    if (hero) {
      const leave = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
      gsap.to(hero.querySelector('.media'), { yPercent: 12, scale: 1.04, ease: 'none', scrollTrigger: leave });
      gsap.to(hero.querySelector('.copy'), { yPercent: -6, opacity: 0.4, ease: 'none', scrollTrigger: leave });
    }

    /* Scene 2: project cards are dealt onto the table from a stacked deck */
    const deck = document.querySelector<HTMLElement>('[data-deck]');
    if (deck) {
      const spread = Math.min(140, innerWidth * 0.18);
      gsap.from(deck.querySelectorAll('[data-card]'), {
        x: (i: number) => (i % 2 ? -spread : spread),
        y: 140,
        rotation: (i: number) => (i % 2 ? 8 : -8),
        opacity: 0,
        transformOrigin: '50% 100%',
        stagger: 0.18,
        ease: 'power2.out',
        scrollTrigger: { trigger: deck, start: 'top 88%', end: 'top 45%', scrub: 0.8 },
      });
    }

    /* Experience timeline: the line draws itself as you scroll past it */
    document.querySelectorAll<HTMLElement>('[data-timeline]').forEach((tl) => {
      const fill = tl.querySelector('[data-timeline-fill]');
      if (!fill) return;
      gsap.fromTo(
        fill,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: { trigger: tl, start: 'top 70%', end: 'bottom 60%', scrub: 0.6 },
        },
      );
      tl.querySelectorAll('[data-timeline-dot]').forEach((dot) => {
        ScrollTrigger.create({
          trigger: dot,
          start: 'top 65%',
          onEnter: () => dot.classList.add('lit'),
          onLeaveBack: () => dot.classList.remove('lit'),
        });
      });
    });

    /* Headings: split into lines once fonts are ready so line breaks are real */
    document.fonts.ready.then(() => {
      document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
        SplitText.create(el, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 1,
              ease: 'power4.out',
              stagger: 0.09,
              scrollTrigger: { trigger: el, start: 'top 88%', once: true },
            }),
        });
      });
      ScrollTrigger.refresh();
    });
  });
}

/* Mouse-only touches */
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  // Buttons lean toward the cursor
  if (!reduce) {
    document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.25}px ${(e.clientY - r.top - r.height / 2) * 0.35}px`;
      });
      b.addEventListener('pointerleave', () => (b.style.translate = ''));
    });
  }

  // Cursor spotlight on cards (pure CSS variables)
  document.querySelectorAll<HTMLElement>('[data-spotlight]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
}
