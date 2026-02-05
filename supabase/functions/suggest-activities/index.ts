import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.25.0";

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

interface SuggestRequest {
  destination: string;
  dateStart?: string;
  dateEnd?: string;
  groupSize: number;
  vibeTags: string[];
  existingActivities?: string[];
}

interface Suggestion {
  name: string;
  description: string;
  category: 'activity' | 'food' | 'experience' | 'nightlife';
  estimatedCost: number;
  duration: string;
  vibes: string[];
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      throw new Error("Missing ANTHROPIC_API_KEY");
    }

    const {
      destination,
      dateStart,
      dateEnd,
      groupSize,
      vibeTags,
      existingActivities = [],
    }: SuggestRequest = await req.json();

    if (!destination) {
      return new Response(
        JSON.stringify({ error: "Destination is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate trip duration
    let nights = 4; // default
    if (dateStart && dateEnd) {
      const start = new Date(dateStart);
      const end = new Date(dateEnd);
      nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Build the prompt
    const existingList = existingActivities.length > 0
      ? existingActivities.join(", ")
      : "None yet";

    const prompt = `You are a travel expert who specializes in finding hidden gems and unique experiences. Suggest 5 activities for a group trip.

Trip Details:
- Destination: ${destination}
- Duration: ${nights} nights
- Group size: ${groupSize} people
- Desired vibes: ${vibeTags.length > 0 ? vibeTags.join(", ") : "Any"}
- Already planned activities: ${existingList}

Requirements:
1. Focus on hidden gems and local favorites, not just tourist traps
2. Include a mix of categories: activities, food experiences, unique experiences, and nightlife
3. Consider the group size when suggesting activities
4. Match the vibe preferences when possible
5. Avoid suggesting activities similar to what's already planned
6. Estimate costs per person in USD

Return ONLY a valid JSON array with exactly 5 suggestions. Each suggestion must have this exact structure:
{
  "name": "Activity Name",
  "description": "A compelling 2-3 sentence description of the activity and why it's special.",
  "category": "activity" | "food" | "experience" | "nightlife",
  "estimatedCost": 50,
  "duration": "2-3 hours",
  "vibes": ["adventure", "culture"]
}

Valid vibe options: party, chill, adventure, culture, nature, luxury, beach, city, food, romantic

Return only the JSON array, no other text.`;

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract the text response
    const textBlock = message.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error("No text response from Claude");
    }

    // Parse the JSON response
    let suggestions: Suggestion[];
    try {
      // Try to extract JSON from the response (in case there's any surrounding text)
      const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }
      suggestions = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("[suggest-activities] Failed to parse response:", textBlock.text);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Validate and sanitize suggestions
    const validatedSuggestions = suggestions.map(s => ({
      name: String(s.name || "").slice(0, 100),
      description: String(s.description || "").slice(0, 500),
      category: ['activity', 'food', 'experience', 'nightlife'].includes(s.category)
        ? s.category
        : 'activity' as const,
      estimatedCost: typeof s.estimatedCost === 'number' ? Math.max(0, s.estimatedCost) : 50,
      duration: String(s.duration || "2-3 hours").slice(0, 50),
      vibes: Array.isArray(s.vibes) ? s.vibes.filter(v => typeof v === 'string').slice(0, 5) : [],
    }));

    console.log(`[suggest-activities] Generated ${validatedSuggestions.length} suggestions for ${destination}`);

    return new Response(
      JSON.stringify({ suggestions: validatedSuggestions }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[suggest-activities] Error:", error.message);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to generate suggestions",
        suggestions: []
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
