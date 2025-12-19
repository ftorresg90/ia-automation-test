import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import prisma from '../utils/prisma';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        organizationId: string;
        email?: string;
    };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') {
        return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Validate token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('Supabase Auth Error:', error);
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Token is valid, "user.id" is the Supabase UUID
        // Now find the corresponding user in our public database
        // NOTE: We assume the public.User.id MATCHES the Supabase auth.users.id
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id } // We will sync IDs
        });

        if (!dbUser) {
            // Edge case: User is authenticated in Supabase but not yet synced to our DB
            // This might happen during registration flow if the sync fails
            return res.status(401).json({ error: 'User not synced', code: 'USER_NOT_SYNCED' });
        }

        req.user = {
            userId: dbUser.id,
            organizationId: dbUser.organizationId,
            email: user.email
        };

        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        return res.status(401).json({ error: 'Authentication failed' });
    }
};
