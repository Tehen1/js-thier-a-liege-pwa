import Link from 'next/link';

export default function NotFound() {
  return <main className="sec" style={{ minHeight: '70vh', padding: '5rem 1rem' }}>
    <h1>Page introuvable</h1><p><Link href="/">Revenir au club</Link></p>
  </main>;
}
