// api/load.ts
import { createClient } from "@libsql/client";
import { VercelRequest, VercelResponse } from '@vercel/node';

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const result = await client.execute({
            sql: `
            SELECT * FROM transactions
            ORDER BY created_at DESC, id DESC
            `
        });

        const transactions = result.rows.map((row: any) => ({
            id: row.id,
            amount: row.amount,
            description: row.description,
            date: row.created_at
        }));

        res.status(200).json({ transactions });
    } catch (error) {
        console.error('Error loading transactions:', error);
        res.status(500).json({ error: 'Failed to load transactions' });
    }
}