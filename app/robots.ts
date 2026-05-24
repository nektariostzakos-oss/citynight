import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

// Env-aware: any non-production environment, or an explicit
// NEXT_PUBLIC_NOINDEX=1 kill switch, returns a blanket Disallow so staging
// deploys and preview branches can't be indexed.

export default function robots(): MetadataRoute.Robots {
  const blockAll =
    process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_NOINDEX === '1';

  if (blockAll) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
      sitemap: `${SITE_URL}/sitemap.xml`,
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/api/', '/*/dashboard/', '/*/claim/', '/*/auth/', '/*/sign-in'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
