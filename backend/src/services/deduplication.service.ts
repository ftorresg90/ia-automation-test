import prisma from '../utils/prisma';
import { generateEmbedding } from './ai.service';

export const normalizeStep = (text: string): string => {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
};

export const findOrRegisterStep = async (text: string, type: string = 'WHEN') => {
    const normalized = normalizeStep(text);

    // 1. Exact match on normalized text
    const existing = await prisma.stepDefinition.findFirst({
        where: { normalized },
    });

    if (existing) {
        return existing;
    }

    // 2. Semantic match (Mocked for now, would use pgvector in real impl)
    // In a real scenario, we would query by vector similarity here.

    // 3. Create new
    const embedding = await generateEmbedding(text);

    const newStep = await prisma.stepDefinition.create({
        data: {
            text,
            normalized,
            type,
            embedding,
        },
    });

    return newStep;
};
