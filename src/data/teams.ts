export const SEASON_END = 2027; // saison 2026-2027 : un U7 est né en 2020

export const F24 = 'https://www.foot24.be/fr/clubs/js-du-thier-a-liege';

export interface Team {
  name: string;
  group: 'ecole' | 'jeunes' | 'seniors';
  u?: number;
  n?: number;
  div?: string;
  path: string;
}

// couleur du liseré selon le groupe (variables CSS : suivent le thème)
export const GROUP_COLOR = {
  ecole: 'var(--yellow)',
  jeunes: 'var(--brand)',
  seniors: 'var(--strong)',
};

// Équipes 2026-2027 (source : Foot24.be, octobre 2026). n = nombre d'équipes dans la catégorie.
export const TEAMS: Team[] = [
  { name: 'U6',  group: 'ecole',  u: 6,  n: 1, div: 'Régionaux', path: 'u6-6286' },
  { name: 'U7',  group: 'ecole',  u: 7,  n: 1, path: 'u7-3023' },
  { name: 'U8',  group: 'ecole',  u: 8,  n: 2, path: 'u8-a-2143' },
  { name: 'U9',  group: 'ecole',  u: 9,  n: 2, path: 'u9-a-2351' },
  { name: 'U10', group: 'jeunes', u: 10, n: 2, path: 'u10-a-1799' },
  { name: 'U11', group: 'jeunes', u: 11, n: 2, path: 'u11-a-1876' },
  { name: 'U12', group: 'jeunes', u: 12, n: 2, path: 'u12-a-1836' },
  { name: 'U13', group: 'jeunes', u: 13, n: 2, div: 'Interprovinciaux (A) · Régionaux (B)', path: 'u13-a-1839' },
  { name: 'U14', group: 'jeunes', u: 14, n: 1, path: 'u14-1570' },
  { name: 'U15', group: 'jeunes', u: 15, n: 1, path: 'u15-8184' },
  { name: 'U17', group: 'jeunes', u: 17, n: 1, path: 'u17-2718' },
  { name: 'Équipe 1A', group: 'seniors', div: '4e provinciale D', path: '1-a-2905' },
  { name: 'Équipe 1B', group: 'seniors', div: '4e provinciale C', path: '1-b-2745' },
  { name: 'Réserves',  group: 'seniors', div: 'Réserves du dimanche', path: 'reserven-3246' },
  { name: 'Vétérans',  group: 'seniors', div: 'Vétérans', path: 'veteranen-245' },
];
