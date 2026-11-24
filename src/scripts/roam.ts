/* ------------------------------------------------------------------
   Roam mode: the page as one explorable board.
   The same sections as Skim mode (the single scroll) are packed into
   columns on a big canvas, with the hero as the hub. Drag, scroll or
   pinch to move; nav links fly the camera. Skim mode undoes all of it.

   Events in:  mode:change {mode, focus}, roam:fly {id}
   Events out: roam:current {id}, roam:explored {fraction}
------------------------------------------------------------------- */
import { gsap } from 'gsap';
import * as sfx from './sound';

const root = document.documentElement;
const stage = document.querySelector<HTMLElement>('[data-stage]');
const world = document.querySelector<HTMLElement>('[data-world]');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (stage && world) init(stage, world);

function init(stage: HTMLElement, world: HTMLElement) {
  const islands = [...world.querySelectorAll<HTMLElement>(':scope > section, :scope > footer')];
  const idOf = (el: HTMLElement) => (el.tagName === 'FOOTER' ? 'footer' : el.id);
  const NAMES: Record<string, string> = {
    top: 'Start',
    story: 'Story',
    experience: 'Experience',
    education: 'Education',
    projects: 'Projects',
    about: 'About',
    contact: 'Contact',
    footer: '',
  };
  // [column, order within column]: the hero sits in the middle, everything else around it
  const LAYOUT: Record<string, [number, number]> = {
    story: [0, 0],
    projects: [0, 1],
    education: [1, 0],
    top: [1, 1],
    about: [1, 2],
    contact: [1, 3],
    footer: [1, 4],
    experience: [2, 0],
  };
  const order = Object.keys(NAMES);

  const minimap = document.querySelector<SVGSVGElement>('[data-minimap]');
  const zoomLabel = document.querySelector<HTMLElement>('[data-zoom-label]');
  const hint = document.querySelector<HTMLElement>('[data-roam-hint]');
  const threads = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  threads.classList.add('roam-threads');
  threads.setAttribute('aria-hidden', 'true');
  const labels = document.createElement('div');
  labels.className = 'roam-labels';
  labels.setAttribute('aria-hidden', 'true');

  let active = false;
  type Box = { id: string; x: number; y: number; w: number; h: number };
  let boxes: Box[] = [];
  let bounds = { x: 0, y: 0, w: 1, h: 1 };
  const cam = { x: 0, y: 0, z: 1 };
  const Z_MIN = 0.12;
  const Z_MAX = 1.3;
  let current = '';
  const explored = new Set<string>();
  let touched = false; // has the visitor moved the board yet?
  let quietUntil = 0; // no "arrival" notes while the board is being set up

  /* ---------------- layout ---------------- */
  const pack = () => {
    const vw = innerWidth;
    // phones: every island is one screen wide (sections lay themselves out for a phone anyway)
    const phone = vw < 760;
    const W = phone ? vw : Math.round(Math.min(1600, Math.max(1200, vw)));
    const gap = phone ? 70 : 160;
    const colW = phone ? [vw, vw, vw] : [1200, W, 1150];
    const colX = [0, colW[0] + gap, colW[0] + gap + W + gap];
    const colY = [0, 0, 0];
    const byCol = islands
      .map((el) => ({ el, id: idOf(el), lc: LAYOUT[idOf(el)] ?? [1, 9] }))
      .sort((a, b) => a.lc[1] - b.lc[1]);
    for (const { el, id, lc } of byCol) {
      const c = lc[0];
      // centre column cards are narrower than the hero; contact and the footer are compact cards
      const compact = id === 'contact' || id === 'footer';
      const w = phone ? colW[c] : c === 1 && id !== 'top' ? Math.min(compact ? 860 : 1100, W) : colW[c];
      el.style.width = `${w}px`;
      el.style.left = `${colX[c] + (colW[c] - w) / 2}px`;
      el.style.top = `${colY[c]}px`;
    }
    // measure after widths are set (heights depend on them), then stack
    colY.fill(0);
    for (const { el, lc } of byCol) {
      const c = lc[0];
      el.style.top = `${colY[c]}px`;
      colY[c] += el.offsetHeight + gap;
    }
    // side columns start level with the hero so they peek in around it
    const hub = islands.find((el) => el.id === 'top');
    const shift = hub ? hub.offsetTop - (phone ? 0 : 220) : 0;
    for (const { el, lc } of byCol) if (lc[0] !== 1) el.style.top = `${parseFloat(el.style.top) + shift}px`;

    boxes = islands.map((el) => ({ id: idOf(el), x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }));
    const pad = 500;
    const x0 = Math.min(...boxes.map((b) => b.x)) - pad;
    const y0 = Math.min(...boxes.map((b) => b.y)) - pad;
    const x1 = Math.max(...boxes.map((b) => b.x + b.w)) + pad;
    const y1 = Math.max(...boxes.map((b) => b.y + b.h)) + pad;
    bounds = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    world.style.width = `${x1}px`;
    world.style.height = `${y1}px`;
    drawExtras();
  };

  const drawExtras = () => {
    const hub = boxes.find((b) => b.id === 'top');
    if (hub) {
      const hx = hub.x + hub.w / 2;
      const hy = hub.y + hub.h / 2;
      threads.innerHTML = boxes
        .filter((b) => b.id !== 'top' && b.id !== 'footer')
        .map((b) => {
          const tx = Math.max(b.x + 80, Math.min(b.x + b.w - 80, hx));
          const ty = Math.max(b.y + 80, Math.min(b.y + b.h - 80, hy));
          const mx = (hx + tx) / 2 + (ty - hy) * 0.12;
          const my = (hy + ty) / 2 - (tx - hx) * 0.12;
          return `<path d="M${hx} ${hy} Q${mx} ${my} ${tx} ${ty}"/>`;
        })
        .join('');
    }
    labels.innerHTML = boxes
      .filter((b) => NAMES[b.id])
      .map((b) => `<span style="left:${b.x + 8}px;top:${b.y - 150}px">${NAMES[b.id]}</span>`)
      .join('');
    if (minimap) {
      minimap.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`);
      minimap.innerHTML =
        boxes
          .map((b) => `<rect class="mm-island" data-id="${b.id}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="50"/>`)
          .join('') + '<rect class="mm-view" rx="40"/>';
    }
  };

  /* ---------------- camera ---------------- */
  const size = () => ({ w: stage.clientWidth, h: stage.clientHeight });
  let lastZoomStep = -1;
  const apply = () => {
    if (!active) return;
    cam.z = Math.min(Z_MAX, Math.max(Z_MIN, cam.z));
    cam.x = Math.min(bounds.x + bounds.w, Math.max(bounds.x, cam.x));
    cam.y = Math.min(bounds.y + bounds.h, Math.max(bounds.y, cam.y));
    const { w, h } = size();
    const tx = w / 2 - cam.x * cam.z;
    const ty = h / 2 - cam.y * cam.z;
    world.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${cam.z.toFixed(4)})`;
    const g = 28 * Math.max(0.5, Math.min(2, cam.z * 1.6));
    stage.style.setProperty('--grid', `${g}px`);
    stage.style.setProperty('--gx', `${tx % g}px`);
    stage.style.setProperty('--gy', `${ty % g}px`);
    world.style.setProperty('--label-o', String(Math.max(0, Math.min(1, (0.5 - cam.z) / 0.2))));
    if (zoomLabel) zoomLabel.textContent = `${Math.round(cam.z * 100)}%`;
    const step = Math.round(cam.z * 10);
    if (lastZoomStep >= 0 && step !== lastZoomStep && !flying) sfx.tick(cam.z / Z_MAX, 0.035);
    lastZoomStep = step;

    // which island is in the middle of the screen
    let best = 'top';
    let bestD = Infinity;
    for (const b of boxes) {
      if (b.id === 'footer') continue;
      const cx = Math.max(b.x, Math.min(b.x + b.w, cam.x));
      const cy = Math.max(b.y, Math.min(b.y + b.h, cam.y));
      const d = Math.hypot(cx - cam.x, cy - cam.y);
      if (d < bestD) {
        bestD = d;
        best = b.id;
      }
    }
    if (best !== current) {
      current = best;
      if (performance.now() > quietUntil && !flying) sfx.note(order.indexOf(best));
      explored.add(best);
      dispatchEvent(new CustomEvent('roam:current', { detail: { id: best } }));
      dispatchEvent(new CustomEvent('roam:explored', { detail: { fraction: explored.size / (order.length - 1) } }));
      minimap?.querySelectorAll('.mm-island').forEach((r) => r.classList.toggle('on', (r as SVGElement).dataset.id === best));
    }
    const view = minimap?.querySelector('.mm-view');
    if (view) {
      view.setAttribute('x', String(cam.x - w / 2 / cam.z));
      view.setAttribute('y', String(cam.y - h / 2 / cam.z));
      view.setAttribute('width', String(w / cam.z));
      view.setAttribute('height', String(h / cam.z));
    }
  };

  const firstTouch = () => {
    if (touched) return;
    touched = true;
    pullBack?.kill();
    hint?.classList.add('gone');
  };

  /* fit an island: wide ones fill the width; tall ones land at their top */
  const frame = (id: string) => {
    const b = boxes.find((x) => x.id === id) ?? boxes.find((x) => x.id === 'top')!;
    const { w, h } = size();
    if (id === 'top') {
      const z = Math.min(1, w / b.w);
      return { x: b.x + b.w / 2, y: b.y + h / 2 / z, z };
    }
    const z = Math.min(1, (w * 0.92) / b.w);
    const x = b.x + b.w / 2;
    const y = b.h * z > h - 80 ? b.y + (h / 2 - 90) / z : b.y + b.h / 2;
    return { x, y, z };
  };

  let flight: gsap.core.Tween | null = null;
  let flying = false;
  const flyTo = (id: string, instant = false) => {
    if (!boxes.length) return;
    const t = frame(id);
    flight?.kill();
    if (instant || reduce) {
      Object.assign(cam, t);
      apply();
      return;
    }
    const from = { ...cam };
    const dist = Math.hypot(t.x - from.x, t.y - from.y);
    if (dist < 4 && Math.abs(t.z - from.z) < 0.01) return;
    flying = true;
    sfx.whoosh({ dur: Math.min(1.4, 0.7 + dist / 4000), from: 220, to: 1400 + Math.min(1600, dist / 2), gain: 0.16 + Math.min(0.14, dist / 20000) });
    const p = { t: 0 };
    flight = gsap.to(p, {
      t: 1,
      duration: Math.min(1.6, 0.75 + dist / 3500),
      ease: 'power3.inOut',
      onUpdate: () => {
        const k = p.t;
        const dip = 1 - Math.min(0.55, dist / 6000) * Math.sin(Math.PI * k);
        cam.x = from.x + (t.x - from.x) * k;
        cam.y = from.y + (t.y - from.y) * k;
        cam.z = (from.z + (t.z - from.z) * k) * dip;
        apply();
      },
      onComplete: () => {
        flying = false;
        sfx.land();
        sfx.note(order.indexOf(id));
      },
      onInterrupt: () => (flying = false),
    });
  };

  /* after the intro: the hero you just watched pulls back to reveal it's one piece of a board */
  let pullBack: gsap.core.Tween | null = null;
  const reveal = () => {
    if (!active || touched || reduce) {
      hint?.classList.add('show');
      return;
    }
    const hub = boxes.find((b) => b.id === 'top')!;
    const { w } = size();
    const z = Math.max(0.42, Math.min(0.62, (w * 0.62) / hub.w));
    const from = { ...cam };
    const to = { x: hub.x + hub.w / 2, y: hub.y + hub.h / 2, z };
    const p = { t: 0 };
    sfx.whoosh({ dur: 1.6, from: 160, to: 900, gain: 0.14, pan: false });
    pullBack = gsap.to(p, {
      t: 1,
      duration: 1.8,
      ease: 'power2.inOut',
      onUpdate: () => {
        cam.x = from.x + (to.x - from.x) * p.t;
        cam.y = from.y + (to.y - from.y) * p.t;
        cam.z = from.z + (to.z - from.z) * p.t;
        apply();
      },
      onComplete: () => hint?.classList.add('show'),
    });
  };

  /* ---------------- input ---------------- */
  const pointers = new Map<number, { x: number; y: number }>();
  let dragging = false;
  let start = { x: 0, y: 0 };
  let vel = { x: 0, y: 0 };
  let lastT = 0;
  let pinch0 = 0;
  let glide = 0;
  let air: ReturnType<typeof sfx.wind> | null = null;
  // things with their own drag never pan the board; links and buttons don't with a mouse
  // (on touch a tap still works: panning only starts once the finger moves)
  const ownsDrag = (t: EventTarget | null) => (t as Element)?.closest?.('[data-story-map], [data-sticker]');
  const interactive = (t: EventTarget | null) =>
    (t as Element)?.closest?.('a, button, input, textarea, select, label, .metric, [data-copy]');

  stage.addEventListener('pointerdown', (e) => {
    if (!active) return;
    if (ownsDrag(e.target)) return;
    if (interactive(e.target) && e.pointerType === 'mouse') return;
    if (e.button && e.pointerType === 'mouse') return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    start = { x: e.clientX, y: e.clientY };
    lastT = performance.now();
    vel = { x: 0, y: 0 };
    cancelAnimationFrame(glide);
    flight?.kill();
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId);
    if (!active || !prev) return;
    if (pointers.size === 2) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch0) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinch0);
      pinch0 = d;
      return;
    }
    if (!dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) return;
    if (!dragging) {
      dragging = true;
      firstTouch();
      stage.classList.add('panning');
      air = sfx.wind();
      try {
        stage.setPointerCapture(e.pointerId);
      } catch {}
    }
    const now = performance.now();
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    cam.x -= dx / cam.z;
    cam.y -= dy / cam.z;
    const dt = Math.max(1, now - lastT);
    vel = { x: dx / dt, y: dy / dt };
    air?.set(Math.hypot(vel.x, vel.y) / 2.5);
    lastT = now;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    apply();
  });
  const end = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    pinch0 = 0;
    if (!dragging || pointers.size) return;
    dragging = false;
    stage.classList.remove('panning');
    air?.stop();
    air = null;
    if (reduce || performance.now() - lastT > 80) return;
    const go = () => {
      vel.x *= 0.92;
      vel.y *= 0.92;
      cam.x -= (vel.x * 16) / cam.z;
      cam.y -= (vel.y * 16) / cam.z;
      apply();
      if (Math.abs(vel.x) + Math.abs(vel.y) > 0.02) glide = requestAnimationFrame(go);
    };
    glide = requestAnimationFrame(go);
  };
  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);
  // a drag that ends on a link or button must not also click it
  stage.addEventListener(
    'click',
    (e) => {
      if (active && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6 && pointers.size === 0 && start.x) {
        e.preventDefault();
        e.stopPropagation();
        start = { x: 0, y: 0 };
      }
    },
    true,
  );

  function zoomAt(sx: number, sy: number, factor: number) {
    const { w, h } = size();
    const wx = cam.x + (sx - w / 2) / cam.z;
    const wy = cam.y + (sy - h / 2) / cam.z;
    cam.z = Math.min(Z_MAX, Math.max(Z_MIN, cam.z * factor));
    cam.x = wx - (sx - w / 2) / cam.z;
    cam.y = wy - (sy - h / 2) / cam.z;
    apply();
  }

  stage.addEventListener(
    'wheel',
    (e) => {
      if (!active) return;
      e.preventDefault();
      firstTouch();
      flight?.kill();
      cancelAnimationFrame(glide);
      if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
      else {
        const k = e.deltaMode === 1 ? 32 : 1;
        cam.x += (e.deltaX * k) / cam.z;
        cam.y += (e.deltaY * k) / cam.z;
        apply();
      }
    },
    { passive: false },
  );

  addEventListener('keydown', (e) => {
    if (!active || (e.target as Element)?.closest?.('input, textarea')) return;
    const step = 160 / cam.z;
    const k: Record<string, () => void> = {
      ArrowLeft: () => (cam.x -= step),
      ArrowRight: () => (cam.x += step),
      ArrowUp: () => (cam.y -= step),
      ArrowDown: () => (cam.y += step),
      '+': () => (cam.z *= 1.2),
      '=': () => (cam.z *= 1.2),
      '-': () => (cam.z /= 1.2),
    };
    // arrow keys inside the story map belong to the map
    if (k[e.key] && !(e.target as Element)?.closest?.('[data-story]')) {
      e.preventDefault();
      firstTouch();
      k[e.key]();
      apply();
    }
  });

  // tabbing to something off-screen brings it into view
  world.addEventListener('focusin', (e) => {
    if (!active || flying) return;
    const r = (e.target as HTMLElement).getBoundingClientRect();
    const { w, h } = size();
    if (r.top >= 70 && r.bottom <= h - 20 && r.left >= 0 && r.right <= w) return;
    const cx = cam.x + (r.left + r.width / 2 - w / 2) / cam.z;
    const cy = cam.y + (r.top + r.height / 2 - h / 2) / cam.z;
    gsap.to(cam, { x: cx, y: cy, duration: 0.5, ease: 'power2.out', onUpdate: apply });
  });

  document.querySelectorAll<HTMLElement>('[data-zoom]').forEach((b) =>
    b.addEventListener('click', () => {
      const { w, h } = size();
      firstTouch();
      zoomAt(w / 2, h / 2, Number(b.dataset.zoom) > 0 ? 1.25 : 0.8);
    }),
  );
  minimap?.addEventListener('click', (e) => {
    const pt = minimap.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(minimap.getScreenCTM()!.inverse());
    const hit = boxes.find((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h);
    firstTouch();
    if (hit) flyTo(hit.id);
    else gsap.to(cam, { x: p.x, y: p.y, duration: 0.8, ease: 'power3.inOut', onUpdate: apply });
  });

  // in-page links (nav, brand, back to top) fly instead of scrolling
  addEventListener(
    'click',
    (e) => {
      if (!active) return;
      const a = (e.target as Element)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const id = a.hash.slice(1) || 'top';
      if (!boxes.some((b) => b.id === id)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      firstTouch();
      flyTo(id);
    },
    true,
  );
  addEventListener('roam:fly', (e) => {
    firstTouch();
    flyTo((e as CustomEvent<{ id: string }>).detail.id);
  });

  let resizeT = 0;
  addEventListener('resize', () => {
    if (!active) return;
    clearTimeout(resizeT);
    resizeT = window.setTimeout(() => {
      if (!active) return;
      pack();
      apply();
    }, 150);
  });

  /* ---------------- on / off ---------------- */
  const enable = (focus?: string) => {
    if (active) return;
    active = true;
    root.classList.add('roam-ready');
    world.prepend(threads);
    world.append(labels);
    window.scrollTo(0, 0);
    pack();
    quietUntil = performance.now() + 600;
    lastZoomStep = -1;
    flyTo(focus && focus !== 'top' ? focus : 'top', true);
    if (focus && focus !== 'top') firstTouch();
  };
  const disable = () => {
    if (!active) return;
    active = false;
    clearTimeout(resizeT);
    flight?.kill();
    pullBack?.kill();
    cancelAnimationFrame(glide);
    root.classList.remove('roam-ready');
    threads.remove();
    labels.remove();
    world.removeAttribute('style');
    islands.forEach((el) => {
      el.style.left = '';
      el.style.top = '';
      el.style.width = '';
    });
  };

  addEventListener('mode:change', (e) => {
    const { mode, focus } = (e as CustomEvent<{ mode: string; focus?: string }>).detail;
    if (mode === 'roam') enable(focus);
    else disable();
  });
  addEventListener('resize', () => active && apply());

  // first load
  if (root.classList.contains('roam')) {
    const go = () => {
      enable();
      // reveal the board once the hero's own intro has played
      const after = () => setTimeout(reveal, 1600);
      if (root.classList.contains('intro-done')) after();
      else addEventListener('intro:done', after, { once: true });
    };
    if (document.readyState === 'complete') go();
    else document.fonts.ready.then(go);
  }
  // (exposed for debugging in the console)
  (window as unknown as { __roam: unknown }).__roam = { cam, flyTo, boxes: () => boxes };
}
