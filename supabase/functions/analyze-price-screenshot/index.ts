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

interface AnalyzeRequest {
  imageBase64: string;
  category?: string;
}

interface PriceResult {
  price: number;
  currency: string;
  description: string;
}

serve(async (req: Request) => {
  console.log("[analyze-price-screenshot] Request received:", req.method);

  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const body = await req.json();
    const { imageBase64, category = "expense" }: AnalyzeRequest = body;

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect media type from base64 header or default to png
    let mediaType = "image/png";
    if (imageBase64.startsWith("/9j/")) {
      mediaType = "image/jpeg";
    } else if (imageBase64.startsWith("R0lGOD")) {
      mediaType = "image/gif";
    } else if (imageBase64.startsWith("UklGR")) {
      mediaType = "image/webp";
    }

    console.log("[analyze-price-screenshot] Calling Claude Vision for", category);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: `Extract the total price from this ${category} screenshot. Look for the final/total price amount, not nightly rates or partial amounts.

Return ONLY valid JSON in this exact format, no additional text:
{"price": <number without currency symbol or commas>, "currency": "USD", "description": "<brief 5-10 word description of what this price is for>"}

If you cannot find a clear price, return:
{"price": 0, "currency": "USD", "description": "Could not extract price from image"}`,
              },
            ],
          },
        ],
      }),
    });

    console.log("[analyze-price-screenshot] Claude response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[analyze-price-screenshot] Claude API error:", errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;
    console.log("[analyze-price-screenshot] AI response:", content);

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response
    let result: PriceResult;
    try {
      // Clean up response - sometimes Claude adds markdown code blocks
      const cleanContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      result = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("[analyze-price-screenshot] Failed to parse:", content);
      throw new Error("Invalid response format from AI");
    }

    // Validate response
    if (typeof result.price !== "number") {
      result.price = parseFloat(result.price) || 0;
    }

    console.log("[analyze-price-screenshot] Returning result:", JSON.stringify(result));
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[analyze-price-screenshot] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to analyze screenshot" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
