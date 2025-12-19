import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/utils/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Project Integration Tests', () => {
    let authToken: string;
    let organizationId: string;
    let userId: string;

    beforeAll(async () => {
        // Setup: Create Organization and User
        const org = await prisma.organization.create({
            data: { name: 'Test Org Project' }
        });
        organizationId = org.id;

        const hashedPassword = await bcrypt.hash('password123', 10);
        const user = await prisma.user.create({
            data: {
                email: `test_project_${Date.now()}@test.com`,
                password: hashedPassword,
                name: 'Test Project User',
                organizationId
            }
        });
        userId = user.id;

        // Generate Token
        authToken = jwt.sign(
            { userId: user.id, email: user.email, organizationId },
            process.env.JWT_SECRET || 'test_secret',
            { expiresIn: '1h' }
        );
    });

    afterAll(async () => {
        // Cleanup
        await prisma.execution.deleteMany({ where: { project: { organizationId } } });
        await prisma.testCase.deleteMany({ where: { project: { organizationId } } });
        await prisma.project.deleteMany({ where: { organizationId } });
        await prisma.user.deleteMany({ where: { organizationId } });
        await prisma.organization.delete({ where: { id: organizationId } });
    });

    describe('POST /projects', () => {
        it('should create a new project with valid data', async () => {
            const res = await request(app)
                .post('/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Integration Test Project',
                    description: 'Created by integration test'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id');
            expect(res.body.name).toBe('Integration Test Project');
            expect(res.body.organizationId).toBe(organizationId);
        });

        it('should fail if name is missing', async () => {
            const res = await request(app)
                .post('/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    description: 'No Name Project'
                });

            expect(res.status).toBe(400); // Bad Request from Zod
            console.log('Failing Test Response Body:', JSON.stringify(res.body, null, 2));
            expect(res.body.errors).toBeDefined();
        });

        it('should fail if name is too short', async () => {
            const res = await request(app)
                .post('/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'ab'
                });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /projects', () => {
        it('should list projects for the organization', async () => {
            // Create another project directly to ensure list has content
            await prisma.project.create({
                data: { name: 'Direct DB Project', organizationId }
            });

            const res = await request(app)
                .get('/projects')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
            // Check that it only returns projects for this org (basic check)
            const otherOrgProject = res.body.find((p: any) => p.organizationId !== organizationId);
            expect(otherOrgProject).toBeUndefined();
        });
    });

    describe('GET /projects/:id', () => {
        it('should return 404 for non-existent project', async () => {
            const res = await request(app)
                .get('/projects/non-existent-id-123')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(404);
        });

        it('should get a project by ID', async () => {
            const newProject = await prisma.project.create({
                data: { name: 'Get By ID Project', organizationId }
            });

            const res = await request(app)
                .get(`/projects/${newProject.id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe(newProject.id);
            expect(res.body.name).toBe('Get By ID Project');
        });
    });
});
