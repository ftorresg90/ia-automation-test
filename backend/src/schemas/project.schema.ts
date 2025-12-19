import { z } from 'zod';

export const createProjectSchema = z.object({
    body: z.object({
        name: z.string({ required_error: 'Project name is required' } as any)
            .min(3, 'Name must be at least 3 characters long'),
        description: z.string().optional(),
    }),
});
