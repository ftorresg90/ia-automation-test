
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspect() {
    try {
        const executionId = 'exec-1766095797739';
        const execution = await prisma.execution.findUnique({
            where: { id: executionId },
            include: { project: { include: { testCases: true } } }
        });

        if (!execution) {
            console.log('Execution not found');
            return;
        }

        console.log('Project:', execution.project.name);
        console.log('Test Cases:');

        for (const tc of execution.project.testCases) {
            console.log(`- ${tc.title}`);
            const steps = tc.steps as any[];
            console.log('  Steps:');
            steps.forEach((s, i) => {
                console.log(`    ${i + 1}. Action: "${s.action}" / Text: "${s.text}"`);
            });
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

inspect();
