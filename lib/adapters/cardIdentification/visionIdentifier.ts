// Uses Claude's vision capability to read the actual card in the listing
// photo, which text alone often can't do (sellers frequently mistitle or
// under-describe cards). This is optional: if ANTHROPIC_API_KEY is not
// set, the pipeline still runs on text heuristics alone, just with a
// lower confidence ceiling (see identify.ts).

export interface VisionResult {
  cardName: string | null;
  setName: string | null;
  cardNumber: string | null;
  rarity: string | null;
  language: string | null;
  isHolo: boolean | null;
  isReverseHolo: boolean | null;
  edition: string | null;
  conditionAssessment: string | null;
  modelConfidence: number; // 0-1, the model's own stated confidence
  reasoning: string;
}

const SYSTEM_PROMPT = `You are assisting a Pokémon card resale tool. You will be shown one or more photos of a Pokémon card listing along with its title/description. Identify the card as precisely as you can from what is actually visible or stated — never guess a fact you can't support from the image or text.

Respond with ONLY a JSON object (no markdown fences, no preamble) matching this shape:
{
  "cardName": string | null,
  "setName": string | null,
  "cardNumber": string | null,
  "rarity": string | null,
  "language": string | null,
  "isHolo": boolean | null,
  "isReverseHolo": boolean | null,
  "edition": string | null,
  "conditionAssessment": string | null,
  "modelConfidence": number,
  "reasoning": string
}

modelConfidence should reflect how legible and unambiguous the card was — a blurry or partially obscured photo should score low, not be papered over with a guess. reasoning should briefly state what visual evidence supported each field.`;

export async function identifyFromImage(
  imageUrls: string[],
  title: string,
  description?: string
): Promise<VisionResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || imageUrls.length === 0) return null;

  try {
    const imageBlocks = await Promise.all(
      imageUrls.slice(0, 3).map(async (url) => {
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        const buf = Buffer.from(await res.arrayBuffer());
        const mediaType = res.headers.get("content-type") || "image/jpeg";
        return {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: mediaType,
            data: buf.toString("base64"),
          },
        };
      })
    );

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              ...imageBlocks,
              {
                type: "text",
                text: `Listing title: ${title}\nListing description: ${
                  description || "(none)"
                }`,
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const textBlock = (data.content ?? []).find(
      (b: { type: string }) => b.type === "text"
    );
    if (!textBlock) return null;

    const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as VisionResult;
    return parsed;
  } catch {
    // A failed vision call should never take down the pipeline — it just
    // means this listing falls back to text-only identification.
    return null;
  }
}
