import { present, type Content } from "../model";
import { SITE_URL, GITHUB_URL, FONT_PRELOAD_HREF } from "../config";

export function Head({ content }: { content: Content }) {
  const { seo, person } = content;
  const description = present(person.positioning) ? person.positioning : seo.description;
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
      <meta name="description" content={description} />
      <link rel="canonical" href={SITE_URL} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={description} />
      <meta name="twitter:description" content={description} />
      <meta property="og:url" content={SITE_URL} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={`${SITE_URL}og-card.png`} />
      <meta name="twitter:card" content="summary_large_image" />
      <link rel="icon" href="data:," />
      <link rel="preload" href={FONT_PRELOAD_HREF} as="font" type="font/woff2" crossOrigin="" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
