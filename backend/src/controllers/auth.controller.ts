import { Request, Response } from 'express';
import bcrypt from 'bcryptjs'; // We might keep this if we want to hash something else, but likely not for password
import { supabase } from '../lib/supabase';
import prisma from '../utils/prisma';

export const setupAccount = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });

        const token = authHeader.split(' ')[1];

        // 1. Validate Supabase Token manually here (since middleware might reject if user not in DB)
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid Supabase token' });
        }

        const { name, organizationName } = req.body;

        // 2. Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (existingUser) {
            return res.json({ message: 'User already synced', user: existingUser });
        }

        // 2b. Check if user exists by EMAIL (Legacy migration)
        if (user.email) {
            const legacyUser = await prisma.user.findUnique({ where: { email: user.email } });
            if (legacyUser) {
                // Update legacy user to use new Supabase ID
                // Note: This relies on User.id not being heavily referenced by non-cascading FKs.
                // Since User only links TO Organization, this should be safe.
                const updatedUser = await prisma.user.update({
                    where: { email: user.email },
                    data: {
                        id: user.id,
                        // Update other fields if needed
                        name: name || legacyUser.name
                    }
                });
                return res.json({ message: 'Legacy user synced', user: updatedUser, organizationId: updatedUser.organizationId });
            }
        }

        // 3. Create User and Organization
        // We use the SAME ID from Supabase for our User.id
        // For password, we don't store it anymore. We can put a placeholder or make it optional in schema.
        // Let's check schema... "password" is required Strings. We should put "managed-by-supabase".

        const organization = await prisma.organization.create({
            data: {
                name: organizationName || 'My Organization',
                users: {
                    create: {
                        id: user.id, // SYNC ID
                        email: user.email!,
                        password: 'managed-by-supabase', // Placeholder
                        name: name || 'User',
                        role: 'ADMIN',
                    },
                },
            },
            include: {
                users: true,
            },
        });

        const newUser = organization.users[0];

        res.json({ user: newUser, organization });

    } catch (error) {
        console.error('Setup Account Error:', error);
        // Ensure we send valid JSON error that frontend can parse
        res.status(500).json({ error: 'Internal server error', details: String(error) });
    }
};

// Deprecated: Login is handled by Frontend + Supabase directly
export const login = async (req: Request, res: Response) => {
    res.status(410).json({ error: 'Login is now handled by Supabase on the client side.' });
};

