// api/save.ts
import { createClient } from "@libsql/client";
import { VercelRequest, VercelResponse } from '@vercel/node';

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!
});

const password = process.env.PASSWORD;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { amount, description, date, inputPassword } = req.body;

    if (inputPassword !== password) {
        return res.status(403).json({ error: '403 Forbidden' });
    }

    if (typeof amount !== 'number' || typeof description !== 'string' || typeof date !== 'string') {
        return res.status(400).json({ error: 'Invalid request body. Expected amount, description, and date.' });
    }

    try {
        const result = await client.execute({
            sql: `
            INSERT INTO transactions (amount, description, created_at)
            VALUES (?, ?, ?)
            RETURNING id
            `,
            args: [amount, description, date]
        });

        const id = result.rows[0].id;
        res.status(200).json({ message: 'Transaction saved successfully', id });

    } catch (error) {
        console.error('Error saving transaction:', error);
        res.status(500).json({ error: 'Failed to save transaction' });
    }
}