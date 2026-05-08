import { Helmet } from "react-helmet-async";

const stripUndefined = <T,>(obj: T): T =>
  JSON.parse(JSON.stringify(obj, (_k, v) => (v === undefined ? undefined : v)));

export const OrganizationSchema = () => (
  <Helmet>
    <script type="application/ld+json">
      {JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Help The Hive",
        url: "https://helpthehive.com",
        logo: "https://helpthehive.com/favicon.png",
        description: "Budget meal planning for real families. Free for SNAP & WIC.",
      })}
    </script>
  </Helmet>
);

export const WebSiteSchema = () => (
  <Helmet>
    <script type="application/ld+json">
      {JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Help The Hive",
        url: "https://helpthehive.com",
      })}
    </script>
  </Helmet>
);

export const FAQPageSchema = ({ faqs }: { faqs: { q: string; a: string }[] }) => (
  <Helmet>
    <script type="application/ld+json">
      {JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      })}
    </script>
  </Helmet>
);

export interface RecipeSchemaInput {
  name: string;
  description?: string;
  image?: string;
  totalTime?: string;
  recipeYield?: string;
  recipeCategory?: string;
  recipeIngredient?: string[];
  recipeInstructions?: string[];
  nutrition?: { calories?: string };
}

export const RecipeSchema = ({ recipe }: { recipe: RecipeSchemaInput }) => (
  <Helmet>
    <script type="application/ld+json">
      {JSON.stringify(
        stripUndefined({
          "@context": "https://schema.org",
          "@type": "Recipe",
          name: recipe.name,
          description: recipe.description,
          image: recipe.image,
          totalTime: recipe.totalTime,
          recipeYield: recipe.recipeYield,
          recipeCategory: recipe.recipeCategory,
          recipeIngredient: recipe.recipeIngredient,
          recipeInstructions: recipe.recipeInstructions?.map((text) => ({
            "@type": "HowToStep",
            text,
          })),
          nutrition: recipe.nutrition
            ? { "@type": "NutritionInformation", calories: recipe.nutrition.calories }
            : undefined,
        }),
      )}
    </script>
  </Helmet>
);
