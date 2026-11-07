export interface Social {
  kind: 'instagram' | 'facebook';
  title: string;
  handle: string;
  href: string;
}

export const SOCIAL: Social[] = [
  { kind: 'instagram', title: 'Suivez-nous sur Instagram', handle: '@js_thier_a_liege_a_', href: 'https://www.instagram.com/js_thier_a_liege_a_/' },
  { kind: 'facebook', title: 'Retrouvez-nous sur Facebook', handle: '@JSTHIERALIEGE', href: 'https://www.facebook.com/JSTHIERALIEGE/' },
];
