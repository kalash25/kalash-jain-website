/* ------------------------------------------------------------------
   "The story so far" flight-path map.
   mountStory(el) wires up one [data-story] block and returns set(p):
   progress 0–1 draws the route, flies the plane, moves the camera and
   switches the chapter card. Anything can drive it: page scroll
   (Story.astro, scroll mode) or buttons and drag (free-roam layouts).
------------------------------------------------------------------- */
import * as sfx from './sound';

export type StoryHandle = { set: (p: number) => void; count: number; destroy: () => void };

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function mountStory(el: HTMLElement): StoryHandle {
  const svg = el.querySelector<SVGSVGElement>('[data-story-map]')!;
  const segs = [...el.querySelectorAll<SVGPathElement>('[data-seg]')];
  const stops = [...el.querySelectorAll<SVGGElement>('[data-stop-mark]')];
  const plane = el.querySelector<SVGGElement>('[data-plane]')!;
  const cards = [...el.querySelectorAll<HTMLElement>('[data-card]')];
  const dots = [...el.querySelectorAll<HTMLElement>('[data-goto]')];
  const counter = el.querySelector<HTMLElement>('[data-count]');
  const cols = Number(svg.dataset.cols);
  const rows = Number(svg.dataset.rows);
  const zooms = (svg.dataset.zooms || '').split(',').map(Number);
  const pts = stops.map((s) => ({ x: Number(s.dataset.x), y: Number(s.dataset.y) }));
  const lens = segs.map((s) => s.getTotalLength());
  segs.forEach((s, i) => {
    s.style.strokeDasharray = `${lens[i]} ${lens[i]}`;
    s.style.strokeDashoffset = `${lens[i]}`;
  });

  const N = cards.length; // one unit of progress per chapter card
  const HOLD = 0.42; // share of each unit spent parked at the stop before taking off
  let active = -1;
  let target = { x: pts[0].x, y: pts[0].y, z: zooms[0] || 1 };
  const cam = { ...target };
  let raf = 0;
  let wasFlying = false;

  const vb = () => {
    const r = svg.getBoundingClientRect();
    const aspect = r.height / Math.max(1, r.width);
    const mobile = r.width < 640;
    // never zoom out so far that the map is a thin band in a tall frame
    const fill = (cols * aspect) / (rows + 4);
    const z = Math.max(cam.z * (mobile ? 1.9 : 1), fill * 0.85);
    const w = cols / z;
    const h = w * aspect;
    // the chapter card sits over the map's bottom-left on wide screens, so frame the plane up and right
    const cx = cam.x - (mobile ? 0 : w * 0.08);
    const cy = cam.y + (mobile ? 0 : h * 0.12);
    // keep the camera inside the map (or centred if the view is bigger than it)
    const x = w >= cols ? (cols - w) / 2 : clamp(cx - w / 2, -4, cols - w + 4);
    const y = h >= rows ? (rows - h) / 2 : clamp(cy - h / 2, -4, rows - h + 4);
    svg.style.setProperty('--u', (w / Math.max(1, r.width)).toFixed(4));
    svg.setAttribute('viewBox', `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
  };

  let last = 0;
  const loop = (now: number) => {
    // time-based easing, so the camera settles at the same speed at any frame rate
    const dt = last ? Math.min(100, now - last) : 16;
    last = now;
    const k = 1 - Math.exp(-dt / 140);
    cam.x += (target.x - cam.x) * k;
    cam.y += (target.y - cam.y) * k;
    cam.z += (target.z - cam.z) * k;
    vb();
    const still = Math.abs(target.x - cam.x) + Math.abs(target.y - cam.y) + Math.abs(target.z - cam.z) < 0.01;
    raf = still ? 0 : requestAnimationFrame(loop);
    if (still) last = 0;
  };
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };

  const setActive = (i: number) => {
    if (i === active) return;
    const first = active === -1;
    active = i;
    cards.forEach((c, j) => c.classList.toggle('on', j === i));
    dots.forEach((d, j) => {
      d.classList.toggle('on', j === i);
      d.classList.toggle('seen', j < i);
      d.setAttribute('aria-current', j === i ? 'step' : 'false');
    });
    stops.forEach((s, j) => s.classList.toggle('reached', j <= Math.min(i, pts.length - 1)));
    if (counter) counter.textContent = `${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
    el.classList.toggle('ended', i >= N - 1);
    if (!first) sfx.tick(0.35 + (i / N) * 0.5, 0.06);
  };

  const set = (p: number) => {
    p = clamp(p);
    const u = Math.min(N - 1e-6, p * N);
    const i = Math.floor(u);
    const f = u - i;
    setActive(i);

    // which leg is being flown, and how far along it
    let leg = -1;
    let t = 0;
    if (i < segs.length && f > HOLD) {
      leg = i;
      t = ease((f - HOLD) / (1 - HOLD));
    }
    segs.forEach((s, j) => {
      const done = j < i ? 1 : j === leg ? t : 0;
      s.style.strokeDashoffset = `${lens[j] * (1 - done)}`;
    });

    // the plane: parked at the current stop, or on the leg it is flying
    let pos = pts[Math.min(i, pts.length - 1)];
    let angle = 0;
    if (leg >= 0) {
      const L = lens[leg];
      const a = segs[leg].getPointAtLength(L * t);
      const b = segs[leg].getPointAtLength(Math.min(L, L * t + 0.4));
      const c = segs[leg].getPointAtLength(Math.max(0, L * t - 0.4));
      pos = { x: a.x, y: a.y };
      angle = (Math.atan2(b.y - c.y, b.x - c.x) * 180) / Math.PI;
    } else if (i < segs.length) {
      // parked: point toward the next leg
      const b = segs[i].getPointAtLength(0.6);
      angle = (Math.atan2(b.y - pos.y, b.x - pos.x) * 180) / Math.PI;
    } else if (segs.length) {
      const L = lens[segs.length - 1];
      const a = segs[segs.length - 1].getPointAtLength(L - 0.6);
      angle = (Math.atan2(pos.y - a.y, pos.x - a.x) * 180) / Math.PI;
    }
    plane.setAttribute('transform', `translate(${pos.x.toFixed(2)} ${pos.y.toFixed(2)}) rotate(${angle.toFixed(1)})`);

    // camera: follow the plane, pulling back mid-flight on long legs
    const zi = zooms[Math.min(i, zooms.length - 1)] || 1;
    let z = zi;
    if (leg >= 0) {
      const zn = zooms[leg + 1] || 1;
      const long = clamp(lens[leg] / 60);
      z = zi + (zn - zi) * t;
      z = Math.min(z, z * (1 - 0.55 * long * Math.sin(Math.PI * t)) + 0.0);
      z = Math.max(1, z);
    }
    target = { x: pos.x, y: pos.y, z };
    kick();

    const flying = leg >= 0 && t > 0.02 && t < 0.98;
    if (flying && !wasFlying && lens[leg] > 40) sfx.whoosh({ dur: 1.4, from: 180, to: 1400, gain: 0.18 });
    wasFlying = flying;
  };

  addEventListener('resize', kick);
  set(0);
  cam.x = target.x;
  cam.y = target.y;
  cam.z = target.z;
  vb();

  return {
    set,
    count: N,
    destroy: () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', kick);
    },
  };
}
