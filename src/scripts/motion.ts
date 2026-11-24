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
const root = document.documentElement;
const roaming = () => root.classList.contains('roam');

/* Scroll-driven animations only make sense in Skim mode (the single scroll). In Roam mode
   (the board) nothing scrolls, so they're parked at their finished state instead. */
const reveals: gsap.core.Animation[] = []; // play once on scroll: finish them for good in Roam
const scrubbed: gsap.core.Animation[] = []; // follow the scroll: parked in Roam, resumed in Skim
const startParked: gsap.core.Animation[] = []; // parked at their start instead (the hero drift)
const triggers: ScrollTrigger[] = []; // plain triggers (timeline dots)
let lenisRef: Lenis | null = null;

function park() {
  for (const a of reveals) {
    // finish the animation first, then drop its trigger WITHOUT killing the animation
    // (a plain kill() takes the animation with it, leaving content stuck at opacity 0)
    a.progress(1);
    a.scrollTrigger?.kill(false, true);
  }
  for (const a of [...scrubbed, ...startParked]) {
    a.scrollTrigger?.disable(false);
    a.progress(startParked.includes(a) ? 0 : 1);
  }
  triggers.forEach((t) => t.disable(false));
  document.querySelectorAll('[data-timeline-dot]').forEach((d) => d.classList.add('lit'));
}
function resume() {
  for (const a of [...scrubbed, ...startParked]) a.scrollTrigger?.enable();
  triggers.forEach((t) => t.enable());
  ScrollTrigger.refresh();
}
addEventListener('mode:change', (e) => {
  const { mode } = (e as CustomEvent<{ mode: string }>).detail;
  if (mode === 'roam') {
    lenisRef?.stop();
    if (!reduce) park();
  } else {
    lenisRef?.start();
    if (!reduce) resume();
  }
});

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
  lenisRef = lenis;
  if (roaming()) lenis.stop();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  afterIntro.then(() => {
    /* Fade-up blocks */
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      const stagger = el.dataset.reveal === 'stagger';
      const tw = gsap.from(stagger ? el.children : el, {
        y: 28,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: stagger ? 0.08 : 0,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      });
      reveals.push(tw);
    });

    /* Scene 1: as you leave the hero, the photo drifts up slower than the page and the copy
       steps back. Transform/opacity only (no pinning, no layout work) so scrolling stays smooth. */
    const hero = document.querySelector<HTMLElement>('[data-hero]');
    if (hero) {
      const leave = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
      startParked.push(
        gsap.to(hero.querySelector('.media'), { yPercent: 12, scale: 1.04, ease: 'none', scrollTrigger: leave }),
        gsap.to(hero.querySelector('.copy'), { yPercent: -6, opacity: 0.4, ease: 'none', scrollTrigger: leave }),
      );
    }

    /* Scene 2: project cards are dealt onto the table from a stacked deck */
    const deck = document.querySelector<HTMLElement>('[data-deck]');
    if (deck) {
      const spread = Math.min(140, innerWidth * 0.18);
      const dealt = gsap.from(deck.querySelectorAll('[data-card]'), {
        x: (i: number) => (i % 2 ? -spread : spread),
        y: 140,
        rotation: (i: number) => (i % 2 ? 8 : -8),
        opacity: 0,
        transformOrigin: '50% 100%',
        stagger: 0.18,
        ease: 'power2.out',
        scrollTrigger: { trigger: deck, start: 'top 88%', end: 'top 45%', scrub: 0.8 },
      });
      scrubbed.push(dealt);
    }

    /* Experience timeline: the line draws itself as you scroll past it */
    document.querySelectorAll<HTMLElement>('[data-timeline]').forEach((tl) => {
      const fill = tl.querySelector('[data-timeline-fill]');
      if (!fill) return;
      const drawn = gsap.fromTo(
        fill,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: { trigger: tl, start: 'top 70%', end: 'bottom 60%', scrub: 0.6 },
        },
      );
      scrubbed.push(drawn);
      tl.querySelectorAll('[data-timeline-dot]').forEach((dot) => {
        const st = ScrollTrigger.create({
          trigger: dot,
          start: 'top 65%',
          onEnter: () => dot.classList.add('lit'),
          onLeaveBack: () => dot.classList.remove('lit'),
        });
        triggers.push(st);
      });
    });

    if (roaming()) park();

    /* Headings: split into lines once fonts are ready so line breaks are real */
    document.fonts.ready.then(() => {
      document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
        SplitText.create(el, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) => {
            const tw = gsap.from(self.lines, {
              yPercent: 110,
              duration: 1,
              ease: 'power4.out',
              stagger: 0.09,
              scrollTrigger: { trigger: el, start: 'top 88%', once: true },
            });
            reveals.push(tw);
            if (roaming()) {
              tw.progress(1);
              tw.scrollTrigger?.kill(false, true);
            }
            return tw;
          },
        });
      });
      ScrollTrigger.refresh();
      if (roaming()) park();
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
