import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractRequest {
  url: string;
  nights?: number;
}

interface ExtractedPrice {
  price: number | null;
  currency: string;
  priceType: "per_night" | "total" | "per_person" | "unknown";
  title: string | null;
  source: string;
  error?: string;
}

function detectSource(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes("airbnb")) return "airbnb";
  if (hostname.includes("vrbo")) return "vrbo";
  if (hostname.includes("booking.com")) return "booking";
  if (hostname.includes("viator")) return "viator";
  if (hostname.includes("getyourguide")) return "getyourguide";
  if (hostname.includes("expedia")) return "expedia";
  if (hostname.includes("hotels.com")) return "hotels";
  if (hostname.includes("tripadvisor")) return "tripadvisor";
  return "unknown";
}

function buildExtractionPrompt(html: string, source: string, url: string): string {
  // Truncate HTML to avoid token limits
  const truncatedHtml = html.substring(0, 50000);

  return `Extract pricing information from this ${source} listing HTML.

URL: ${url}

HTML content (truncated):
${truncatedHtml}

Extract and return ONLY valid JSON with this exact structure:
{
  "price": <number or null if not found>,
  "currency": "<USD, EUR, etc. - default to USD if unclear>",
  "priceType": "<per_night | total | per_person | unknown>",
  "title": "<listing title or null>"
}

Guidelines:
- For Airbnb/VRBO/Booking: Look for nightly rate, often near "per night" or in price breakdown. Look for data in JSON-LD scripts or price elements.
- For Viator/GetYourGuide: Look for activity price, often "per person" or "from $X"
- Extract the base price, not prices with fees added
- If you find multiple prices, use the primary/displayed price
- Return null for price if you cannot find a clear price

Return ONLY the JSON, no explanation.`;
}

async function fetchWithBrowserless(url: string, apiKey: string): Promise<string> {
  const browserlessUrl = `https://chrome.browserless.io/content?token=${apiKey}`;

  const response = await fetch(browserlessUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: url,
      waitFor: 3000, // Wait 3 seconds for page to load
      gotoOptions: {
        waitUntil: "networkidle2",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Browserless error:", errorText);
    throw new Error(`Browserless error: ${response.status}`);
  }

  return await response.text();
}

async function fetchDirect(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });

  if (!response.ok) {
    throw new Error(`Direct fetch failed: ${response.status}`);
  }

  return await response.text();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const browserlessKey = Deno.env.get("BROWSERLESS_API_KEY");

    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const { url, nights }: ExtractRequest = await req.json();

    if (!url || !url.startsWith("http")) {
      return new Response(
        JSON.stringify({ error: "Valid URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const source = detectSource(url);
    let html: string;

    // Use Browserless for sites that need JavaScript rendering (like Airbnb)
    const needsBrowser = ["airbnb", "vrbo", "booking"].includes(source);

    if (needsBrowser && browserlessKey) {
      console.log("Using Browserless for:", source);
      try {
        html = await fetchWithBrowserless(url, browserlessKey);
      } catch (browserlessError) {
        console.error("Browserless failed, trying direct fetch:", browserlessError);
        html = await fetchDirect(url);
      }
    } else {
      console.log("Using direct fetch for:", source);
      html = await fetchDirect(url);
    }

    // Use Claude to extract price from HTML
    const prompt = buildExtractionPrompt(html, source, url);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse Claude's response
    let extracted: { price: number | null; currency: string; priceType: string; title: string | null };
    try {
      extracted = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      extracted = { price: null, currency: "USD", priceType: "unknown", title: null };
    }

    // Calculate total if we have per-night price and nights
    let finalPrice = extracted.price;
    let finalPriceType = extracted.priceType;

    if (extracted.price && extracted.priceType === "per_night" && nights && nights > 0) {
      finalPrice = extracted.price * nights;
      finalPriceType = "total";
    }

    const result: ExtractedPrice = {
      price: finalPrice,
      currency: extracted.currency || "USD",
      priceType: finalPriceType as ExtractedPrice["priceType"],
      title: extracted.title,
      source,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error extracting price:", error);
    return new Response(
      JSON.stringify({
        price: null,
        currency: "USD",
        priceType: "unknown",
        title: null,
        source: "unknown",
        error: error.message || "Failed to extract price"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
