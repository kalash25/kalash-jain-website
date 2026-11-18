// All the words on the site live here, so content edits never touch layout code.

export const links = {
  email: 'kalashjain@g.ucla.edu',
  linkedin: 'https://www.linkedin.com/in/kalash-jain/',
  github: 'https://github.com/kalash25',
  resume: '/resume/Kalash-Jain-Resume.pdf',
};

// "Greatest hits": headline numbers, counted up on scroll
export const hits = [
  { value: 10000, suffix: '+', label: 'trade scenarios tested daily on a platform I co-designed' },
  { value: 2000, suffix: '/hr', label: 'test bookings, up from about one an hour' },
  { value: 800, suffix: '+', label: 'engineering hours saved per release' },
  { value: 1, suffix: '%', prefix: '30% → ', label: 'false test failures, after I redesigned the comparison' },
];

export type Role = { title: string; dates: string };
export type Entry = {
  org: string;
  mark: string; // short monogram until real logos are added
  place: string;
  when: string;
  roles?: Role[];
  summary: string;
  points: string[];
  now?: boolean;
};

export const experience: Entry[] = [
  {
    org: 'UCLA Anderson School of Management',
    mark: 'UCLA',
    place: 'Los Angeles, CA',
    when: 'Class of 2028',
    now: true,
    summary: 'MBA, Technology & AI Leadership specialization. Merit Fellowship recipient.',
    points: [
      'Director of Learning & Development, Tech Business Association',
      'Director of Alumni Relations, South Asian Business Association',
      'Recruiting for Summer 2027 product management internships',
    ],
  },
  {
    org: 'JPMorgan Chase & Co.',
    mark: 'JPMC',
    place: 'Mumbai & Bangalore, India',
    when: '2022 – 2026',
    roles: [
      { title: 'Software Engineer Intern', dates: '2022' },
      { title: 'Software Development Engineer I', dates: '2023 – 2025' },
      { title: 'Software Development Engineer II', dates: '2026' },
    ],
    summary:
      'Built the testing, automation and data platforms behind global trading desks, and did the work of getting them adopted: with ops, risk, accounting and regulatory teams.',
    points: [
      'Co-designed a pre-release testing platform after a faulty change sent wrong data to regulators; it now runs 10,000+ trade scenarios a day across 10+ businesses',
      'Made the case to replace five near-duplicate booking tools with one, won leadership sign-off, then shipped it: onboarding fell from a month to two days',
      'Owned the migration of ~800 data feeds to AWS with accounting, settlement, credit risk and regulatory teams',
      'Ran sprints as Scrum Master for a 20-person team for a year, and won 1st place among 500+ engineers at the firm hackathon',
    ],
  },
  {
    org: 'Punjab Engineering College',
    mark: 'PEC',
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

// Off-the-clock marquee
export const offClock = [
  'Published poet · 300+ poems',
  'Lead singer & guitarist, JPMC firm band',
  'State-level junior basketball',
  'Hackathon winner, 1st of 500+',
  'Builds AI agents with Claude Code',
  'Ex Editor-in-Chief',
];
