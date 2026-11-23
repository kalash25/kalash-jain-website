/* ------------------------------------------------------------------
   Two ways to see the site:
   - Roam ("Explore mode"): the board you drag around (default on bigger screens)
   - Skim: the classic single scroll (default on phones), for a quick read
   The choice is remembered (localStorage 'mode'). The class is set before
   first paint in Base.astro; this module handles switching.
------------------------------------------------------------------- */
import { soft } from './sound';

const root = document.documentElement;
const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-mode-toggle]')];
const mode = () => (root.classList.contains('roam') ? 'roam' : 'skim');

let roamCurrent = 'top';
addEventListener('roam:current', (e) => (roamCurrent = (e as CustomEvent<{ id: string }>).detail.id));

// the section in the middle of the screen, so switching keeps your place
const skimFocus = () => {
  const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
  return (el?.closest('[data-world] > section') as HTMLElement | null)?.id || 'top';
};

const sync = () => {
  const m = mode();
  buttons.forEach((b) => {
    b.setAttribute('aria-label', m === 'roam' ? 'Switch to Skim mode: one simple scroll' : 'Switch to Explore mode: the board');
    b.title = b.getAttribute('aria-label')!;
  });
};
sync();

export function setMode(next: 'roam' | 'skim') {
  if (next === mode()) return;
  const focus = next === 'roam' ? skimFocus() : roamCurrent;
  root.classList.toggle('roam', next === 'roam');
  root.classList.toggle('skim', next === 'skim');
  try {
    localStorage.setItem('mode', next);
  } catch {}
  sync();
  dispatchEvent(new CustomEvent('mode:change', { detail: { mode: next, focus } }));
  if (next === 'skim') {
    // keep your place: scroll to the section you were looking at on the board
    requestAnimationFrame(() => document.getElementById(focus)?.scrollIntoView({ behavior: 'instant', block: 'start' }));
  }
  soft({ up: next === 'roam' });
  dispatchEvent(
    new CustomEvent('toast', {
      detail: next === 'skim' ? 'Skim mode: the trailer, not the film.' : 'Explore mode: drag anywhere.',
    }),
  );
}

buttons.forEach((b) => b.addEventListener('click', () => setMode(mode() === 'roam' ? 'skim' : 'roam')));
