import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodObject } from 'zod';

export const validateRequest = (schema: ZodObject<any>) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        return next();
    } catch (error) {
        console.log('Validation Error Caught:', error);
        console.log('Is instance of ZodError?', error instanceof ZodError);
        if (error instanceof ZodError) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: (error as any).errors.map((e: any) => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};
