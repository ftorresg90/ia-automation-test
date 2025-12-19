import prisma from './src/utils/prisma';
import { generateProjectZip } from './src/services/generator.service';
import * as fs from 'fs';

async function main() {
    const project = await prisma.project.findFirst({
        where: { testCases: { some: {} } },
        include: { testCases: true }
    });

    if (!project) {
        console.error('No project with test cases found');
        process.exit(1);
    }

    console.log(`Generating with Cucumber Expressions for: ${project.name}`);
    const zipBuffer = await generateProjectZip(project.id);
    fs.writeFileSync('./cucumber-expr-test.zip', zipBuffer);
    console.log('Generated: ./cucumber-expr-test.zip');
}

main().catch(console.error).finally(() => process.exit(0));
