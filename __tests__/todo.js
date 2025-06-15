const request = require('supertest');
const db = require('../models');
const app = require('../app');

let server, agent;

describe("Learning Management System Test Suite", () => {
    beforeAll(async () => {
        await db.sequelize.sync({ force: true });
        server = app.listen(3000);
        agent = request.agent(server);
    });

    afterAll(async () => {
        await db.sequelize.close();
        await server.close();
    });

    // Authentication Tests
    describe("Authentication", () => {
        test("should register a new educator", async () => {
            const response = await agent
                .post("/auth/signup")
                .send({
                    email: "educator@test.com",
                    password: "password123",
                    role: "educator",
                    name: "Test Educator"
                });
            expect(response.status).toBe(302); 
        });

        test("should register a new student", async () => {
            const response = await agent
                .post("/auth/signup")
                .send({
                    email: "student@test.com",
                    password: "password123",
                    role: "student",
                    name: "Test Student"
                });
            expect(response.status).toBe(302); 
        });

        test("should login user", async () => {
            const response = await agent
                .post("/session")
                .send({
                    email: "educator@test.com",
                    password: "password123"
                });
            expect(response.status).toBe(302); // Redirect after successful login
        });
    });

    // Course Management Tests
    describe("Course Management", () => {
        let courseId;
        let authToken;

        beforeEach(async () => {
            // Login as educator
            const loginResponse = await agent
                .post("/session")
                .send({
                    email: "educator@test.com",
                    password: "password123"
                });
        });

        test("should create a new course", async () => {
            const response = await agent
                .post("/courses/create")
                .send({
                    name: "Test Course",
                    description: "This is a test course"
                });
            expect(response.status).toBe(302); // Redirect after successful creation
        });


        test("should get all courses", async () => {
            const response = await agent
                .get("/courses");
            expect(response.status).toBe(200);
            expect(response.text).toContain("Test Course");
        });
    });

    // Student Progress Tests
    describe("Student Progress", () => {
        let studentToken;
        let courseId;

        beforeEach(async () => {
            // Login as student
            const loginResponse = await agent
                .post("/session")
                .send({
                    email: "student@test.com",
                    password: "password123"
                });

            // Get course ID from the courses page
            const coursesResponse = await agent.get("/courses");
            const courseMatch = coursesResponse.text.match(/Course ID: (\d+)/);
            if (courseMatch) {
                courseId = courseMatch[1];
            }
        });

        test("should enroll in a course", async () => {
            const response = await agent
                .post(`/course/${courseId}/enroll`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("success", true);
        });

        test("should mark page as complete", async () => {
            // Login as educator to create chapter and page
            await agent
                .post("/session")
                .send({
                    email: "educator@test.com",
                    password: "password123"
                });

            // Get course ID from the courses page
            const coursesResponse = await agent.get("/courses");
            const courseMatch = coursesResponse.text.match(/Course ID: (\d+)/);
            const courseIdLocal = courseMatch ? courseMatch[1] : courseId;

            // Create a chapter
            const chapterResponse = await agent
                .post(`/course/${courseIdLocal}/chapters`)
                .send({
                    title: "Test Chapter",
                    description: "Test Chapter Description"
                });
            expect(chapterResponse.status).toBe(302);
            const chapterId = chapterResponse.headers.location.split('/').pop();

            // Create a page in the chapter
            const pageResponse = await agent
                .post(`/course/${courseIdLocal}/chapters/pages`)
                .send({
                    chapterId: chapterId,
                    title: "Test Page",
                    content: "Test Page Content"
                });
            expect(pageResponse.status).toBe(302);
            const pageId = pageResponse.headers.location.split('/').pop();

            // Login as student
            await agent
                .post("/session")
                .send({
                    email: "student@test.com",
                    password: "password123"
                });

            // Enroll in the course
            await agent.post(`/course/${courseIdLocal}/enroll`);

            // Now mark the page as complete
            const response = await agent
                .post(`/course/${courseIdLocal}/chapters/${chapterId}/complete/${pageId}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("success", true);
        });

        test("should get course progress", async () => {
            const response = await agent
                .get(`/course/${courseId}`);
            expect(response.status).toBe(200);
            expect(response.text).toContain("Course ID: " + courseId);
        });
    });

    // Error Handling Tests
    describe("Error Handling", () => {
        test("should handle invalid login", async () => {
            const response = await agent
                .post("/session")
                .send({
                    email: "wrong@test.com",
                    password: "wrongpassword"
                });
            expect(response.status).toBe(302); // Redirect to login page
        });

        test("should handle unauthorized course access", async () => {
            const response = await agent
                .get("/course/999");
            expect(response.status).toBe(404);
        });

        test("should handle invalid course enrollment", async () => {
            const response = await agent
                .post("/course/999/enroll");
            expect(response.status).toBe(404);
        });
    });
});