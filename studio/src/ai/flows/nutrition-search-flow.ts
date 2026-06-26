
'use server';

import { ai } from '@/ai/genkit-instance';
import {
    FoodSearchInputSchema,
    FoodSearchOutputSchema,
    type FoodSearchInput,
    type FoodSearchOutput,
} from '@/ai/schemas';

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getFatSecretToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
        return cachedToken.value;
    }

    const clientId = process.env.FATSECRET_CLIENT_ID;
    const clientSecret = process.env.FATSECRET_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('FatSecret API credentials are not configured. Add FATSECRET_CLIENT_ID and FATSECRET_CLIENT_SECRET to your .env file.');
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await fetch('https://oauth.fatsecret.com/connect/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials&scope=basic',
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`FatSecret auth failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    cachedToken = {
        value: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    return cachedToken.value;
}

const searchFoodFlow = ai.defineFlow(
    {
        name: 'searchFoodFlow',
        inputSchema: FoodSearchInputSchema,
        outputSchema: FoodSearchOutputSchema,
    },
    async ({ query }) => {
        const token = await getFatSecretToken();

        const params = new URLSearchParams({
            method: 'foods.search',
            search_expression: query,
            format: 'json',
            max_results: '10',
        });

        const res = await fetch(`https://platform.fatsecret.com/rest/server.api?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`FatSecret search failed (${res.status}): ${err}`);
        }

        const data = await res.json();
        const foods = data.foods?.food;

        if (!foods) return { items: [] };

        const list = Array.isArray(foods) ? foods : [foods];

        const items = list.map((food: any) => {
            // FatSecret returns a description string like "Per 100g - Calories: 89kcal | Fat: 0.33g | Carbs: 23g | Protein: 1.09g"
            const desc: string = food.food_description || '';
            const get = (label: string) => {
                const m = desc.match(new RegExp(`${label}:\\s*([\\d.]+)`,'i'));
                return m ? parseFloat(m[1]) : 0;
            };

            return {
                fdcId: food.food_id?.toString() ?? '',
                name: food.food_name ?? '',
                calories: get('Calories'),
                protein: get('Protein'),
                carbs: get('Carbs'),
                fat: get('Fat'),
                sugar: 0,
                sodium: 0,
                iron: 0,
                potassium: 0,
                portion: 100,
                image: null,
            };
        });

        return { items };
    }
);

export async function searchFood(input: FoodSearchInput): Promise<FoodSearchOutput> {
    return searchFoodFlow(input);
}
