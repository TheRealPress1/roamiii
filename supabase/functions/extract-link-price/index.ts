import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const allowedOrigins = [
  "http://localhost:8080",
  "http://localhost:3000",
  "http://localhost:5173",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN");

  // Check if origin is allowed
  const isAllowed =
    allowedOrigins.includes(origin) ||
    origin.endsWith(".vercel.app") ||
    (allowedOrigin && origin === allowedOrigin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

interface ExtractRequest {
  url: string;
  nights?: number;
  checkIn?: string;  // YYYY-MM-DD format
  checkOut?: string; // YYYY-MM-DD format
  guests?: number;
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

// Modify Airbnb URL to include check-in/check-out dates for accurate total pricing
function buildAirbnbUrlWithDates(url: string, checkIn?: string, checkOut?: string, guests?: number): string {
  try {
    const urlObj = new URL(url);

    // Add or update check_in and check_out params
    if (checkIn) {
      urlObj.searchParams.set("check_in", checkIn);
    }
    if (checkOut) {
      urlObj.searchParams.set("check_out", checkOut);
    }
    if (guests && guests > 0) {
      urlObj.searchParams.set("adults", guests.toString());
    }

    return urlObj.toString();
  } catch {
    return url;
  }
}

function buildExtractionPrompt(html: string, source: string, url: string, hasDates: boolean): string {
  // Truncate HTML to avoid token limits
  const truncatedHtml = html.substring(0, 50000);

  const airbnbGuidelines = hasDates
    ? `- For Airbnb: Look for the TOTAL price for the stay (not per-night). This includes cleaning fees, service fees, and taxes. Look for text like "Total before taxes", "Total", or the final price shown in the booking summary. The URL has check_in/check_out dates so the page shows total pricing.`
    : `- For Airbnb: Look for the nightly rate, often near "per night". Look for data in JSON-LD scripts or price elements.`;

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
${airbnbGuidelines}
- For VRBO/Booking: Look for total price if dates are in URL, otherwise nightly rate.
- For Viator/GetYourGuide: Look for activity price, often "per person" or "from $X"
- If you find multiple prices, use the primary/displayed price (usually the larger, more prominent one)
- Return null for price if you cannot find a clear price

Return ONLY the JSON, no explanation.`;
}

async function fetchWithBrowserless(url: string, apiKey: string): Promise<string> {
  // Use stealth mode to evade bot detection
  const browserlessUrl = `https://chrome.browserless.io/content?token=${apiKey}&stealth`;

  const response = await fetch(browserlessUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: url,
      bestAttempt: true, // Return whatever we get even if page has errors
      waitFor: 8000, // Wait 8 seconds for dynamic content to load
      gotoOptions: {
        waitUntil: "networkidle0", // Wait until no network activity
        timeout: 30000,
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
  console.log("[extract-link-price] Request received:", req.method);

  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const browserlessKey = Deno.env.get("BROWSERLESS_API_KEY");

    console.log("[extract-link-price] ANTHROPIC_API_KEY present:", !!anthropicKey);
    console.log("[extract-link-price] BROWSERLESS_API_KEY present:", !!browserlessKey);

    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const { url, nights, checkIn, checkOut, guests }: ExtractRequest = await req.json();
    console.log("[extract-link-price] URL:", url);
    console.log("[extract-link-price] Nights:", nights);
    console.log("[extract-link-price] Check-in:", checkIn);
    console.log("[extract-link-price] Check-out:", checkOut);
    console.log("[extract-link-price] Guests:", guests);

    if (!url || !url.startsWith("http")) {
      return new Response(
        JSON.stringify({ error: "Valid URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const source = detectSource(url);
    console.log("[extract-link-price] Detected source:", source);

    // For Airbnb, modify URL to include dates if provided
    let fetchUrl = url;
    const hasDates = !!(checkIn && checkOut);
    if (source === "airbnb" && hasDates) {
      fetchUrl = buildAirbnbUrlWithDates(url, checkIn, checkOut, guests);
      console.log("[extract-link-price] Modified Airbnb URL with dates:", fetchUrl);
    }

    let html: string;

    // Use Browserless for sites that need JavaScript rendering (like Airbnb)
    const needsBrowser = ["airbnb", "vrbo", "booking"].includes(source);
    console.log("[extract-link-price] Needs browser rendering:", needsBrowser);

    if (needsBrowser && browserlessKey) {
      console.log("[extract-link-price] Using Browserless for:", source);
      try {
        html = await fetchWithBrowserless(fetchUrl, browserlessKey);
        console.log("[extract-link-price] Browserless HTML length:", html.length);
      } catch (browserlessError: any) {
        console.error("[extract-link-price] Browserless failed:", browserlessError.message);
        console.log("[extract-link-price] Falling back to direct fetch");
        html = await fetchDirect(fetchUrl);
        console.log("[extract-link-price] Direct fetch HTML length:", html.length);
      }
    } else {
      console.log("[extract-link-price] Using direct fetch for:", source);
      if (needsBrowser && !browserlessKey) {
        console.warn("[extract-link-price] WARNING: Site needs browser but BROWSERLESS_API_KEY not set!");
      }
      html = await fetchDirect(fetchUrl);
      console.log("[extract-link-price] Direct fetch HTML length:", html.length);
    }

    // Use Claude to extract price from HTML
    console.log("[extract-link-price] Calling Claude to extract price...");
    const prompt = buildExtractionPrompt(html, source, fetchUrl, hasDates);

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

    console.log("[extract-link-price] Claude API status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[extract-link-price] Anthropic API error:", errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;
    console.log("[extract-link-price] Claude response:", content);

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse Claude's response
    let extracted: { price: number | null; currency: string; priceType: string; title: string | null };
    try {
      extracted = JSON.parse(content);
      console.log("[extract-link-price] Parsed extraction:", JSON.stringify(extracted));
    } catch {
      console.error("[extract-link-price] Failed to parse AI response:", content);
      extracted = { price: null, currency: "USD", priceType: "unknown", title: null };
    }

    // Calculate total if we have per-night price and nights
    // Skip multiplication if we already fetched Airbnb with dates (should already be total)
    let finalPrice = extracted.price;
    let finalPriceType = extracted.priceType;

    const alreadyHasTotal = source === "airbnb" && hasDates && extracted.priceType === "total";
    if (extracted.price && extracted.priceType === "per_night" && nights && nights > 0 && !alreadyHasTotal) {
      finalPrice = extracted.price * nights;
      finalPriceType = "total";
      console.log("[extract-link-price] Calculated total from per-night:", finalPrice);
    }

    const result: ExtractedPrice = {
      price: finalPrice,
      currency: extracted.currency || "USD",
      priceType: finalPriceType as ExtractedPrice["priceType"],
      title: extracted.title,
      source,
    };

    console.log("[extract-link-price] Final result:", JSON.stringify(result));
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[extract-link-price] Error:", error.message);
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
