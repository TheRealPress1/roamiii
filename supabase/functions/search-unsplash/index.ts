import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const allowedOrigins = [
  // Development
  "http://localhost:8080",
  "http://localhost:3000",
  "http://localhost:5173",
  // Production
  "https://roamiii.app",
  "https://roamiii.co",
  "https://roamiii.com",
  "https://www.roamiii.app",
  "https://www.roamiii.co",
  "https://www.roamiii.com",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const isAllowed = allowedOrigins.includes(origin) || origin.endsWith(".vercel.app");

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

interface SearchRequest {
  query: string;
}

interface UnsplashResult {
  image_url: string;
  photographer: string;
  unsplash_link: string;
}

interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    links: {
      html: string;
    };
  };
  links: {
    html: string;
  };
}

interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessKey = Deno.env.get("UNSPLASH_ACCESS_KEY");

    if (!accessKey) {
      console.error("[search-unsplash] Missing UNSPLASH_ACCESS_KEY");
      return new Response(
        JSON.stringify({ error: "Unsplash API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { query }: SearchRequest = await req.json();

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[search-unsplash] Searching for:", query);

    // Search Unsplash API
    const searchUrl = new URL("https://api.unsplash.com/search/photos");
    searchUrl.searchParams.set("query", query.trim());
    searchUrl.searchParams.set("per_page", "6"); // Get a few options
    searchUrl.searchParams.set("orientation", "landscape"); // Better for cover images

    const response = await fetch(searchUrl.toString(), {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[search-unsplash] Unsplash API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Unsplash API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: UnsplashSearchResponse = await response.json();

    if (data.results.length === 0) {
      console.log("[search-unsplash] No results found for:", query);
      return new Response(
        JSON.stringify({ error: "No images found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return the first result, sized for cover images (800x450)
    const photo = data.results[0];
    const imageUrl = `${photo.urls.raw}&w=800&h=450&fit=crop&q=80`;

    const result: UnsplashResult = {
      image_url: imageUrl,
      photographer: photo.user.name,
      unsplash_link: photo.links.html,
    };

    console.log("[search-unsplash] Found image:", result.image_url);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[search-unsplash] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to search Unsplash" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
