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

  // Check if origin is allowed
  const isAllowed =
    allowedOrigins.includes(origin) ||
    origin.endsWith(".vercel.app");

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

interface EstimateRequest {
  destination: string;
  dateStart: string | null;
  dateEnd: string | null;
  attendeeCount: number;
  vibeTags: string[];
}

interface CostEstimate {
  lodging: number;
  transport: number;
  food: number;
  activities: number;
  reasoning: string;
}

function calculateNights(dateStart: string | null, dateEnd: string | null): number {
  if (!dateStart || !dateEnd) {
    return 4; // Default to 4 nights if dates not provided
  }
  const start = new Date(dateStart);
  const end = new Date(dateEnd);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 1);
}

function buildPrompt(
  destination: string,
  nights: number,
  attendeeCount: number,
  vibeTags: string[]
): string {
  const vibeDescription = vibeTags.length > 0
    ? `The trip vibe is: ${vibeTags.join(", ")}.`
    : "This is a general leisure trip.";

  return `You are a travel cost estimation assistant. Estimate realistic costs in USD for a group trip with the following details:

- Destination: ${destination}
- Duration: ${nights} nights
- Group size: ${attendeeCount} people
- ${vibeDescription}

Provide a cost breakdown for the ENTIRE GROUP (not per person) in the following categories:
1. Lodging - Total accommodation cost for all ${nights} nights for the entire group
2. Transport - Round-trip flights/transportation for all ${attendeeCount} people
3. Food - Estimated food budget for the group for the entire trip
4. Activities - Tours, excursions, entertainment for the group

Consider:
- Current market rates for the destination
- The trip vibe (e.g., "luxury" means higher-end options, "budget" means economical)
- Seasonal variations (assume moderate season if dates unknown)
- Group discounts where applicable

Respond ONLY with valid JSON in this exact format, no additional text:
{
  "lodging": <number>,
  "transport": <number>,
  "food": <number>,
  "activities": <number>,
  "reasoning": "<brief 1-2 sentence explanation of the estimates>"
}`;
}

serve(async (req: Request) => {
  console.log("[estimate-trip-costs] Request received:", req.method, req.url);

  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("[estimate-trip-costs] Handling CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    console.log("[estimate-trip-costs] API key present:", !!apiKey);

    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const body = await req.json();
    console.log("[estimate-trip-costs] Request body:", JSON.stringify(body));
    const { destination, dateStart, dateEnd, attendeeCount, vibeTags }: EstimateRequest = body;

    if (!destination || destination.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Destination is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nights = calculateNights(dateStart, dateEnd);
    const groupSize = Math.max(attendeeCount || 1, 1);
    const tags = vibeTags || [];

    const prompt = buildPrompt(destination, nights, groupSize, tags);
    console.log("[estimate-trip-costs] Calling Anthropic API for:", destination);

    // Call Anthropic API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    console.log("[estimate-trip-costs] Anthropic response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[estimate-trip-costs] Anthropic API error:", errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;
    console.log("[estimate-trip-costs] AI response content:", content);

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response from Claude
    let estimate: CostEstimate;
    try {
      estimate = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid response format from AI");
    }

    // Validate the response has required fields
    if (
      typeof estimate.lodging !== "number" ||
      typeof estimate.transport !== "number" ||
      typeof estimate.food !== "number" ||
      typeof estimate.activities !== "number"
    ) {
      throw new Error("Invalid cost estimate format");
    }

    console.log("[estimate-trip-costs] Returning estimate:", JSON.stringify(estimate));
    return new Response(JSON.stringify(estimate), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[estimate-trip-costs] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to estimate costs" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
