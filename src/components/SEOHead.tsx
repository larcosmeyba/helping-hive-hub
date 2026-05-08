import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  noindex?: boolean;
}

const BASE_URL = "https://helpthehive.com";

export function SEOHead({
  title,
  description,
  canonical,
  ogImage = "/og-image.png",
  ogType = "website",
  noindex = false,
}: SEOHeadProps) {
  const canonicalUrl = canonical
    ? canonical.startsWith("http")
      ? canonical
      : `${BASE_URL}${canonical.startsWith("/") ? canonical : `/${canonical}`}`
    : BASE_URL;

  const imageUrl = ogImage.startsWith("http") ? ogImage : `${BASE_URL}${ogImage}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex" />}

      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="Help The Hive" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
    </Helmet>
  );
}

export default SEOHead;
