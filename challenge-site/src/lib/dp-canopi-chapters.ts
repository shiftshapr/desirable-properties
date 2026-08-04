export const DP_CANOPI_COMMUNITY_ID = 'c0f30bc5-de17-4328-80d9-ff8f364907da';

export const DP_CANOPI_CHAPTERS = [
  { value: '', label: 'All chapters' },
  { value: 'intro', label: 'Intro' },
  ...Array.from({ length: 23 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return { value: `dp${n}`, label: `DP${i + 1}` };
  }),
];
