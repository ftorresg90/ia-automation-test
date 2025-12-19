import prisma from './src/utils/prisma';
import { generateProjectZip } from './src/services/generator.service';
import * as fs from 'fs';

async function main() {
    // Find a project with test cases
    const project = await prisma.project.findFirst({
        where: {
            testCases: {
                some: {}
            }
        },
        include: {
            testCases: true
        }
    });

    if (!project) {
        console.error('No project found with test cases');
        process.exit(1);
    }

    console.log(`Generating framework for project: ${project.name} (${project.id})`);

    const zipBuffer = await generateProjectZip(project.id);
    const outputPath = './generated-url-test.zip';
    fs.writeFileSync(outputPath, zipBuffer);

    console.log(`ZIP generated at: ${outputPath}`);
}

main()
    .catch(console.error)
    .finally(() => process.exit(0));
