export interface Photo {
  src: string;
  alt: string;
  caption: string;
  source?: string;
  poster?: boolean;
  portrait?: boolean;
  hero?: boolean;
}

// Galerie : déposer la photo dans images/ puis ajouter une ligne ici.
export const PHOTOS: Photo[] = [
  {
    src: 'images/b529bf4e.png',
    alt: 'Une équipe de jeunes de la JS en maillot jaune et bleu marine avec son entraîneur, devant le club-house',
    caption: 'Nos jeunes, au Thier',
    source: 'Facebook',
  },
  // Jsthier gallery assets 2026-11-02 (supplied by club)
  {
    src: '/images/halloween-party-2026-10-30.jpg',
    alt: 'Affiche de la soirée Halloween du club, le vendredi 30 octobre, à 19 h',
    caption: 'Archives · Halloween, 30 octobre 2026',
    source: '',
    poster: true,
    portrait: true,
    hero: false,
  },
  {
    src: '/images/tournois-jeunes-mai.jpg',
    alt: 'Affiche illustrée des tournois de jeunes du club en mai, catégories U7 à U14',
    caption: 'Tournois de jeunes · Mai',
    source: '',
    poster: true,
    portrait: false,
    hero: false,
  },
  {
    src: '/images/cotisations-2026-2027.jpg',
    alt: 'Affiche des cotisations 2026-2027 pour les membres du club',
    caption: 'Informations · Cotisations 2026–2027',
    source: '',
    poster: true,
    portrait: false,
    hero: false,
  },
  {
    src: '/images/recrutement-u10-u12-u17.jpg',
    alt: 'Affiche de recrutement pour les équipes U10, U12 et U17',
    caption: 'Recrutement · U10, U12 et U17',
    source: '',
    poster: true,
    portrait: false,
    hero: false,
  },
  {
    src: '/images/reprise-entrainements.jpg',
    alt: 'Affiche du planning de reprise des entraînements des équipes de jeunes',
    caption: 'Vie du club · Reprise des entraînements',
    source: '',
    poster: true,
    portrait: false,
    hero: false,
  },
  {
    src: '/images/recrutement-u17-joueurs-gardiens.jpg',
    alt: 'Affiche de recrutement de joueurs et gardiens pour les U17',
    caption: 'Recrutement · U17, joueurs et gardiens',
    source: '',
    poster: true,
    portrait: false,
    hero: false,
  },
  {
    src: '/images/photo-equipe-jeunes-clubhouse.jpg',
    alt: 'Équipe de jeunes du club avec son encadrement, devant le club-house',
    caption: 'Photo de club · Équipe de jeunes',
    source: '',
    poster: true,
    portrait: false,
    hero: false,
  },
  {
    src: '/images/u9-equipe.gif',
    alt: 'Équipe U9 du club, dessin animé style cartoon années 90',
    caption: 'Équipe U9 · Cartoon années 90',
    source: '',
    poster: true,
    portrait: false,
    hero: false,
  },
];

export const HERO_CARDS = [
  {
    html: '<b>21</b><span>équipes en 2026-2027</span><small>Des U6 aux vétérans</small>',
    caption: 'La JS en chiffres',
  },
  {
    html: '<img src="/images/crest.svg" alt="" width="92" height="107"><span>Inscriptions ouvertes</span><small>Chèques-sport acceptés</small>',
    caption: 'Rejoignez le club',
    alt: true,
  },
];
