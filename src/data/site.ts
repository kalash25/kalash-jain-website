// All the words on the site live here, so content edits never touch layout code.

export const links = {
  email: 'kalashjain@g.ucla.edu',
  linkedin: 'https://www.linkedin.com/in/kalash-jain/',
  github: 'https://github.com/kalash25',
  resume: '/resume/Kalash-Jain-Resume.pdf',
};

export type Logo = { src: string; ratio: number; alt: string };
export type Role = { title: string; dates: string };
export type Entry = {
  org: string;
  logo: Logo;
  place: string;
  when: string;
  roles?: Role[];
  summary: string;
  points: string[];
  current?: boolean;
};

export const experience: Entry[] = [
  {
    org: 'JPMorgan Chase & Co.',
    logo: { src: '/logos/jpmorganchase.svg', ratio: 1000 / 141.83, alt: 'JPMorganChase' },
    place: 'Mumbai & Bangalore, India',
    when: '2022 – 2026',
    roles: [
      { title: 'Software Engineer Intern', dates: '2022' },
      { title: 'Software Development Engineer I', dates: '2023 – 2025' },
      { title: 'Software Development Engineer II', dates: '2026' },
    ],
    summary:
      'Worked on the testing, automation and data tools used by trading and operations teams, and partnered closely with those teams to get them adopted.',
    points: [
      'Co-designed a pre-release testing platform for trade bookings, used across 10+ business lines',
      'Proposed consolidating five overlapping booking tools into one, got senior leadership sign-off, and delivered it end to end',
      'Led the migration of ~800 data feeds to AWS alongside accounting, settlement, credit risk and regulatory teams',
      'Ran sprints as Scrum Master for a 20-person team for a year',
      'Won 1st place among 500+ participants in the firm-wide hackathon',
    ],
  },
];

export const education: Entry[] = [
  {
    org: 'UCLA Anderson School of Management',
    logo: { src: '/logos/ucla-anderson.svg', ratio: 230.71 / 44, alt: 'UCLA Anderson' },
    place: 'Los Angeles, CA',
    when: 'Class of 2028',
    current: true,
    summary: 'M.B.A., Full-Time Program. Technology & AI Leadership specialization.',
    points: [
      'Merit Fellowship recipient',
      'Director of Learning & Development, Tech Business Association',
      'Director of Alumni Relations, South Asian Business Association',
    ],
  },
  {
    org: 'Punjab Engineering College',
    logo: { src: '/logos/pec.png', ratio: 320 / 143, alt: 'PEC' },
    place: 'Chandigarh, India',
    when: 'Class of 2023',
    summary: 'B.Tech, Computer Science.',
    points: [
      'Editor-in-Chief, English Editorial Board',
      'COLOR Institute Award for extracurricular excellence (top 5% of ~800 students)',
    ],
  },
];

export const projects = [
  {
    name: 'Runway',
    kind: 'Multi-agent AI recruiting tool',
    problem:
      'MBA recruiting meant an hour of research per company and a pipeline scattered across spreadsheets.',
    built:
      'Agents that research a company and write a brief, feeding one kanban pipeline for companies and contacts.',
    stats: ['~1 hr → 90 s per brief', '50+ briefs', '40+ companies, 80+ contacts'],
  },
  {
    name: 'LifeOS',
    kind: 'AI journal on Telegram',
    problem: 'Nightly journaling that never turned into decisions I could track.',
    built:
      'A Telegram journal that turns nightly entries into tracked decisions and weekly reviews scored against my goals.',
    stats: ['30+ entries', '4+ weekly reviews', '63 unit tests + 2 evals'],
  },
];

// Draggable stickers on the hero photo (decorative; the same facts are in the text)
export const stickers = ['ex-JPMorgan Chase', "UCLA Anderson MBA '28", 'published poet ✎', 'builds with AI'];

// Off-the-clock marquee
export const offClock = [
  'Published poet',
  'Writes the occasional song',
  'Builds personal apps with AI',
  'Former Editor-in-Chief',
  'State-level junior basketball',
  'Hackathon winner',
];
