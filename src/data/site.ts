// All the words on the site live here, so content edits never touch layout code.

export const links = {
  email: 'kalashjain@g.ucla.edu',
  linkedin: 'https://www.linkedin.com/in/kalash-jain/',
  github: 'https://github.com/kalash25',
  resume: '/resume/Kalash-Jain-Resume.pdf',
};

export type Logo = { src: string; ratio: number; alt: string };
export type Role = { title: string; dates: string };
export type Group = { heading: string; points: string[] };
export type Entry = {
  org: string;
  logo: Logo;
  place: string;
  when?: string;
  roles?: Role[];
  summary?: string;
  points?: string[];
  groups?: Group[];
  current?: boolean;
};

// Mirrors the resume: roles with exact dates, then the three sub-sections
export const experience: Entry[] = [
  {
    org: 'JPMorgan Chase & Co.',
    logo: { src: '/logos/jpmorganchase.svg', ratio: 1000 / 141.83, alt: 'JPMorganChase' },
    place: 'Mumbai & Bangalore, India',
    roles: [
      { title: 'Software Development Engineer II (Associate)', dates: 'Jan 2026 – Jun 2026' },
      { title: 'Software Development Engineer I (Analyst)', dates: 'Aug 2023 – Dec 2025' },
      { title: 'Software Engineer Intern', dates: 'Jan 2022 – Jun 2022' },
    ],
    groups: [
      {
        heading: 'Product Strategy & Ownership',
        points: [
          'Co-designed a pre-release testing platform after a faulty code change sent wrong data to regulators; reached 10,000+ daily trade scenarios across 10+ businesses, catching 3–4 high-impact bugs',
          'Championed replacing 5 booking tools sharing 70–80% duplicate code with one tool, ending reliance on an external team; refined with product and tech leads and won senior leadership approval',
          'Delivered the new tool end-to-end and retired all 5 old tools, cutting new business-line onboarding from 1 month to 2 days; lowered failed bookings 30%, trimmed booking time 25%, and unlocked 40% of untested scenarios',
          'Reduced false test failures from ~30% to ~1% by proposing a new way to compare test results, approved by the product lead; exposed a previously hidden cross-business code break',
        ],
      },
      {
        heading: 'Execution & Adoption',
        points: [
          "Integrated missing trade-confirmation data into test results to unblock our main stakeholder's adoption; authored the approval proposal and onboarded 10+ business lines in under a week each",
          'Scaled test bookings from ~1/hour to 2,000/hour by mapping manual flows with ops across 4 business units and automating 99% with their sign-off; saved 800+ hours per release, keeping 2 migrations on schedule',
          'Scoped and shipped 9 complex deal types with ops, required by 95% of test scenarios; launched a self-serve spreadsheet upload for bulk scenario creation, turning 10 minutes per scenario into 3,000+ per upload',
        ],
      },
      {
        heading: 'Cross-Functional Leadership',
        points: [
          'Partnered with accounting, settlement, credit risk and regulatory teams to own migration of ~800 feeds to AWS; automated parity checks exposing long-running data errors in 15–20% of feeds, secured sign-off and sped delivery 20%',
          'Collaborated with our product lead on backlog priorities and cleared blockers to minimize spillover by running sprints as Scrum Master for a 20-person team over a year',
          'Surveyed risk teams building inconsistent dashboards to find their most-used charts; built a self-serve, customizable chart library, shrinking build time from ~1 day to under an hour for 5 pilot teams',
        ],
      },
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

// Draggable stickers next to the hero photo (decorative; the same facts are in the text)
export const stickers = ['ex-JPMorgan Chase', "UCLA Anderson MBA '28", 'published poet ✎', 'builds with AI'];

// Off-the-clock marquee
export const offClock = ['Published poet', 'Musician', 'Building apps with AI'];
