# AutoQA Pro

AutoQA Pro is an AI-powered SaaS platform for automated QA. It generates Selenium + Java + Cucumber frameworks, performs step deduplication, and executes visual validations using Playwright.

## Features

- **AI-Driven Framework Generation**: Generates robust Selenium/Java code.
- **Step Deduplication**: Reuses existing steps to avoid code bloat.
- **Visual Validation**: Uses Playwright for screenshot/video capture.
- **Multi-Tenant**: Organization-based access control.
- **Jira Integration**: Import test cases from CSV/Excel.

## Prerequisites

- Node.js v16+
- PostgreSQL
- Java 11+ (for running generated frameworks)
- Maven (for running generated frameworks)

## Setup

1.  **Clone the repository**
2.  **Install Dependencies**:
    ```bash
    cd backend && npm install
    cd ../frontend && npm install
    ```
3.  **Database Setup**:
    - Ensure PostgreSQL is running.
    - Update `backend/.env` with your `DATABASE_URL`.
    - Run migrations:
      ```bash
      cd backend
      npx prisma db push
      ```
4.  **Environment Variables**:
    - Set `OPENAI_API_KEY` in `backend/.env` for AI features.

## Running the Application

Use the startup script to launch both backend and frontend:

```bash
./start-all.sh
```

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:5173`

## Usage Flow

1.  Register a new account (creates an Organization).
2.  Create a new Project.
3.  Upload a Test Plan (CSV/Excel).
4.  Click "Download Framework" to get the Java/Selenium project.
5.  Click "Run Visual Validation" to execute Playwright checks.

## Jenkins Integration

To run the generated framework in Jenkins:

1.  Create a **Pipeline** job.
2.  Use the `Jenkinsfile` provided in the generated ZIP (or create one):
    ```groovy
    pipeline {
        agent any
        tools {
            maven 'Maven 3.8.6' 
            jdk 'JDK 11'
        }
        stages {
            stage('Build & Test') {
                steps {
                    sh 'mvn clean test'
                }
            }
        }
        post {
            always {
                cucumber 'target/cucumber-reports.json'
            }
        }
    }
    ```
