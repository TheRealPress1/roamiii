import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
}

interface FetchRequest {
  url: string;
}

// Extract OpenGraph metadata from HTML
function extractOGMetadata(html: string, url: string): LinkPreview {
  const getMetaContent = (property: string): string | null => {
    // Try og: prefix first
    let match = html.match(new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']*)["']`, 'i'));
    if (!match) {
      match = html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${property}["']`, 'i'));
    }
    // Fallback to twitter: prefix
    if (!match) {
      match = html.match(new RegExp(`<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']*)["']`, 'i'));
    }
    if (!match) {
      match = html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']twitter:${property}["']`, 'i'));
    }
    return match ? decodeHTMLEntities(match[1]) : null;
  };

  // Get title from og:title or <title> tag
  let title = getMetaContent('title');
  if (!title) {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    title = titleMatch ? decodeHTMLEntities(titleMatch[1]) : null;
  }

  // Get description
  let description = getMetaContent('description');
  if (!description) {
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    if (!descMatch) {
      const descMatch2 = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
      description = descMatch2 ? decodeHTMLEntities(descMatch2[1]) : null;
    } else {
      description = decodeHTMLEntities(descMatch[1]);
    }
  }

  // Get image
  let imageUrl = getMetaContent('image');
  if (imageUrl && !imageUrl.startsWith('http')) {
    // Convert relative URL to absolute
    try {
      const baseUrl = new URL(url);
      imageUrl = new URL(imageUrl, baseUrl.origin).toString();
    } catch {
      imageUrl = null;
    }
  }

  // Get site name
  let siteName = getMetaContent('site_name');
  if (!siteName) {
    try {
      siteName = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      siteName = null;
    }
  }

  return {
    url,
    title: title?.trim() || null,
    description: description?.trim()?.slice(0, 300) || null,
    image_url: imageUrl || null,
    site_name: siteName || null,
  };
}

// Decode HTML entities
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ');
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { url }: FetchRequest = await req.json();

    if (!url || !url.startsWith("http")) {
      return new Response(
        JSON.stringify({ error: "Valid URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check cache first
    const { data: cached } = await supabase
      .from("link_previews")
      .select("*")
      .eq("url", url)
      .single();

    if (cached) {
      // Check if cache is fresh (less than 24 hours old)
      const fetchedAt = new Date(cached.fetched_at);
      const hoursSinceFetch = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceFetch < 24) {
        console.log("[fetch-link-preview] Returning cached preview for:", url);
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch the URL
    console.log("[fetch-link-preview] Fetching URL:", url);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RoamiiiBot/1.0; +https://roamiii.app)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    const preview = extractOGMetadata(html, url);

    console.log("[fetch-link-preview] Extracted preview:", preview);

    // Save to cache (upsert)
    const { error: upsertError } = await supabase
      .from("link_previews")
      .upsert(
        {
          url: preview.url,
          title: preview.title,
          description: preview.description,
          image_url: preview.image_url,
          site_name: preview.site_name,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "url" }
      );

    if (upsertError) {
      console.error("[fetch-link-preview] Failed to cache preview:", upsertError);
      // Continue anyway, just return the preview
    }

    return new Response(JSON.stringify(preview), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[fetch-link-preview] Error:", error.message);
    return new Response(
      JSON.stringify({
        url: "",
        title: null,
        description: null,
        image_url: null,
        site_name: null,
        error: error.message || "Failed to fetch preview",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
