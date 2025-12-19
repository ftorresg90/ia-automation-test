import { Request, Response } from 'express';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import fs from 'fs';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const uploadFile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { projectId } = req.body;
        const filePath = req.file.path;
        const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();

        let testCases: any[] = [];

        if (fileExt === 'csv') {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const records = parse(fileContent, {
                columns: true,
                skip_empty_lines: true,
            });
            testCases = await Promise.all(records.map(async (record: any) => {
                let steps = [];
                try {
                    steps = record.Steps ? JSON.parse(record.Steps) : [];
                } catch (e) {
                    // Not JSON, assume natural language
                    if (record.Steps) {
                        const { convertNaturalLanguageSteps } = await import('../services/ai.service');
                        steps = await convertNaturalLanguageSteps(record.Steps);
                    }
                }

                return {
                    title: record.Summary || record.Title || 'Untitled Case',
                    description: record.Description || '',
                    steps,
                    feature: record.Component || record.Feature || 'General',
                };
            }));
        } else if (fileExt === 'xlsx') {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const records = XLSX.utils.sheet_to_json(sheet);
            testCases = records.map((record: any) => ({
                title: record.Summary || record.Title || 'Untitled Case',
                description: record.Description || '',
                steps: [], // Parsing steps from Excel might need more logic depending on format
                feature: record.Component || record.Feature || 'General',
            }));
        }

        // Save to DB
        const savedCases = [];
        for (const testCase of testCases) {
            const saved = await prisma.testCase.create({
                data: {
                    title: testCase.title,
                    description: testCase.description,
                    steps: testCase.steps,
                    feature: testCase.feature,
                    project: { connect: { id: projectId } },
                },
            });
            savedCases.push(saved);
        }

        // Cleanup
        fs.unlinkSync(filePath);

        res.json({ message: 'File processed successfully', count: savedCases.length, cases: savedCases });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error processing file' });
    }
};
