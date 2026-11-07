import type { ImgHTMLAttributes } from 'react';

type Props = ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string; unoptimized?: boolean };

// Mirrors next/image defaults: lazy unless the image is marked high priority (hero crest).
export default function Image({ unoptimized, loading, ...img }: Props) {
  void unoptimized; // next/image-only flag; step 4 moves images to astro:assets
  return <img {...img} loading={loading ?? (img.fetchPriority === 'high' ? 'eager' : 'lazy')} />;
}
