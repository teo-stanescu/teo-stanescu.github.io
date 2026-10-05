import type { Content } from "../model";
import { SITE_URL, GITHUB_URL } from "../config";

export function Head({ content }: { content: Content }) {
  const { seo, person } = content;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    jobTitle: person.title,
    url: SITE_URL,
    sameAs: [GITHUB_URL],
    description: person.summary,
  };
  return (
    <>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <link rel="canonical" href={SITE_URL} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:url" content={SITE_URL} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={`${SITE_URL}og-card.png`} />
      <meta name="twitter:card" content="summary_large_image" />
      <link rel="icon" href="data:," />
      <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
