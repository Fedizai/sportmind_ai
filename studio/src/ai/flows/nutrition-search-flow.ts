'use server';

import { ai } from '@/ai/genkit-instance';
import {
    FoodSearchInputSchema,
    FoodSearchOutputSchema,
    type FoodSearchInput,
    type FoodSearchOutput,
} from '@/ai/schemas';

/**
 * Food lookup for the nutrition tracker.
 *
 * Two providers, tried in order:
 *
 *  1. FatSecret — far better coverage of branded and non-US products, which is
 *     what athletes actually scan. Its API rejects calls from addresses that
 *     aren't registered in the FatSecret console ("Invalid IP address
 *     detected"); Cloud Run egress IPs are dynamic, so the console must allow
 *     the 0.0.0.0/0 range for this to succeed in production.
 *  2. USDA FoodData Central — no IP restriction at all, so it is the safety net
 *     whenever FatSecret rejects us or is unreachable.
 *
 * Order matters only for quality: if the first provider errors or returns
 * nothing, the second one answers, so the search never hard-fails.
 */

type FoodItem = FoodSearchOutput['items'][number];

/* ---------------------------- USDA (fallback) ---------------------------- */

/** Nutrient IDs in the USDA FoodData Central schema. */
const USDA_NUTRIENT = {
    calories: 1008,
    protein: 1003,
    fat: 1004,
    carbs: 1005,
    sugar: 2000,
    sodium: 1093,
    iron: 1089,
    potassium: 1092,
} as const;

async function searchUsda(query: string): Promise<FoodItem[]> {
    // DEMO_KEY works without signup but is rate limited to ~30 requests/hour,
    // so it is only a stop-gap until a free key is set in the environment.
    const apiKey = process.env.USDA_FOODDATA_CENTRAL_API_KEY?.trim();
    const key = apiKey && !apiKey.startsWith('YOUR_') ? apiKey : 'DEMO_KEY';

    const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query,
            dataType: ['Foundation', 'SR Legacy', 'Branded'],
            pageSize: 12,
        }),
    });

    if (!res.ok) {
        throw new Error(`USDA responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }

    const data = await res.json();
    return (data.foods ?? []).map((food: any): FoodItem => {
        const read = (id: number) =>
            Number(food.foodNutrients?.find((n: any) => n.nutrientId === id)?.value) || 0;
        return {
            fdcId: String(food.fdcId ?? ''),
            name: food.description ?? '',
            calories: read(USDA_NUTRIENT.calories),
            protein: read(USDA_NUTRIENT.protein),
            carbs: read(USDA_NUTRIENT.carbs),
            fat: read(USDA_NUTRIENT.fat),
            sugar: read(USDA_NUTRIENT.sugar),
            sodium: read(USDA_NUTRIENT.sodium),
            iron: read(USDA_NUTRIENT.iron),
            potassium: read(USDA_NUTRIENT.potassium),
            portion: 100, // USDA values are per 100 g
            image: null,
        };
    });
}

/* --------------------------- FatSecret (primary) -------------------------- */

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getFatSecretToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

    const clientId = process.env.FATSECRET_CLIENT_ID;
    const clientSecret = process.env.FATSECRET_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('FatSecret credentials are not configured.');

    const res = await fetch('https://oauth.fatsecret.com/connect/token', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials&scope=basic',
    });
    if (!res.ok) throw new Error(`FatSecret auth failed (${res.status})`);

    const data = await res.json();
    cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
    return cachedToken.value;
}

async function searchFatSecret(query: string): Promise<FoodItem[]> {
    const token = await getFatSecretToken();
    const params = new URLSearchParams({
        method: 'foods.search',
        search_expression: query,
        format: 'json',
        max_results: '12',
    });

    const res = await fetch(`https://platform.fatsecret.com/rest/server.api?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`FatSecret search failed (${res.status})`);

    const data = await res.json();
    // FatSecret reports IP-allowlist rejections as a 200 with an error body.
    if (data.error) throw new Error(`FatSecret error ${data.error.code}: ${data.error.message}`);

    const foods = data.foods?.food;
    if (!foods) return [];

    return (Array.isArray(foods) ? foods : [foods]).map((food: any): FoodItem => {
        // e.g. "Per 100g - Calories: 89kcal | Fat: 0.33g | Carbs: 23g | Protein: 1.09g"
        const desc: string = food.food_description ?? '';
        const read = (label: string) => {
            const m = desc.match(new RegExp(`${label}:\\s*([\\d.]+)`, 'i'));
            return m ? parseFloat(m[1]) : 0;
        };
        return {
            fdcId: String(food.food_id ?? ''),
            name: food.food_name ?? '',
            calories: read('Calories'),
            protein: read('Protein'),
            carbs: read('Carbs'),
            fat: read('Fat'),
            sugar: 0,
            sodium: 0,
            iron: 0,
            potassium: 0,
            portion: 100,
            image: null,
        };
    });
}

/* --------------------------------- flow ---------------------------------- */

const searchFoodFlow = ai.defineFlow(
    {
        name: 'searchFoodFlow',
        inputSchema: FoodSearchInputSchema,
        outputSchema: FoodSearchOutputSchema,
    },
    async ({ query }) => {
        const term = query.trim();
        if (!term) return { items: [] };

        const failures: string[] = [];

        for (const [label, provider] of [
            ['FatSecret', searchFatSecret],
            ['USDA', searchUsda],
        ] as const) {
            try {
                const items = await provider(term);
                if (items.length > 0) return { items };
                failures.push(`${label}: no results`);
            } catch (err) {
                // Try the next provider rather than failing the whole search.
                console.error(`Food search via ${label} failed:`, err);
                failures.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }

        console.warn('Food search returned nothing.', failures.join(' | '));
        return { items: [] };
    }
);

export async function searchFood(input: FoodSearchInput): Promise<FoodSearchOutput> {
    return searchFoodFlow(input);
}
