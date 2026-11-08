import type { MetadataRoute } from 'next';

// Icons land with the PWA install work; the manifest ships now so the install
// prompt has a name, colour, and standalone display mode to read.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kyne — Penjadwalan Shift',
    short_name: 'Kyne',
    description: 'Jadwal shift mingguan untuk tim Kyne.',
    start_url: '/',
    display: 'standalone',
    lang: 'id',
    background_color: '#ffffff',
    theme_color: '#ffffff',
  };
}
