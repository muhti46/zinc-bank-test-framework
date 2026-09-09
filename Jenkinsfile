// Jenkins CI/CD pipeline for the Playwright + Cucumber + TypeScript framework.
// Repo: https://github.com/muhti46/zinc-bank-test-framework (public) - branch main.
//
// Jenkins prerequisites (see jenkins/README.md):
//   - Plugins: Pipeline, Git, NodeJS, Timestamper, Build Discarder
//   - Global Tool Configuration: NodeJS installation named "NodeJS"
//   - Credentials (Secret text) created from your .env values - never committed:
//       zincbank-app-username
//       zincbank-app-password
//       zincbank-app-invalid-username
//       zincbank-app-invalid-password
//       zincbank-app-error-text
//
// Triggers:
//   - Manual: "Build with Parameters" (choose TEST_SUITE)
//   - Nightly (Mo-Sa) at 08:00 via cron
//   - SCM polling every 5 min picks up pushed changes (localhost controller
//     cannot receive GitHub webhooks)

pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 60, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10', artifactNumToKeepStr: '5'))
        disableConcurrentBuilds()
    }

    triggers {
        cron('0 8 * * 1-6')
        pollSCM('H/5 * * * *')
    }

    parameters {
        choice(
            name: 'TEST_SUITE',
            choices: ['full', 'smoke', 'regression'],
            description: 'Which suite to run? Currently all choices run the whole suite (features/login.feature); split them later with Cucumber tags if needed.'
        )
    }

    environment {
        // Non-secret values: public ZincBank demo application (login page URL).
        BASE_URL = 'https://zincbank.cydeo.io/login'
        HEADLESS = 'true'

        // Secret values live in the Jenkins credential store - never in git.
        APP_USERNAME         = credentials('zincbank-app-username')
        APP_PASSWORD         = credentials('zincbank-app-password')
        APP_INVALID_USERNAME = credentials('zincbank-app-invalid-username')
        APP_INVALID_PASSWORD = credentials('zincbank-app-invalid-password')
        EXPECTED_ERROR_TEXT  = credentials('zincbank-app-error-text')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup Node') {
            steps {
                nodejs(nodeJSInstallationName: 'NodeJS') {
                    // Java is required by the Allure CLI (report generation).
                    bat 'node --version && npm --version && java -version'
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                nodejs(nodeJSInstallationName: 'NodeJS') {
                    bat 'npm ci'
                }
            }
        }

        stage('Install Playwright Browsers') {
            steps {
                nodejs(nodeJSInstallationName: 'NodeJS') {
                    // Windows: --with-deps is not supported, so plain chromium.
                    bat 'npx playwright install chromium'
                }
            }
        }

        stage('Typecheck') {
            steps {
                nodejs(nodeJSInstallationName: 'NodeJS') {
                    bat 'npm run typecheck'
                }
            }
        }

        stage('Run Tests & Build Reports') {
            steps {
                nodejs(nodeJSInstallationName: 'NodeJS') {
                    script {
                        echo "Running test suite: ${params.TEST_SUITE ?: 'full'}"
                    }
                    // Run the tests, then ALWAYS build BOTH reports (Cucumber
                    // HTML + Allure HTML), but keep the Cucumber exit code so a
                    // failing suite stays red.
                    bat '''
                        call npm test
                        set TEST_EXIT=%errorlevel%
                        call npm run report:generate
                        call npm run report:allure:generate
                        exit /b %TEST_EXIT%
                    '''
                }
            }
        }
    }

    post {
        always {
            // Publish the Allure report so the build page shows the native
            // "Allure Report" link + trend graph (uses the controller's
            // Allure commandline tool, see jenkins/README.md). Wrapped in a
            // try/catch: a reporting problem must never flip the build result.
            script {
                try {
                    step([
                        $class: 'AllureReportPublisher',
                        allureVersion: '3',
                        includeProperties: false,
                        reportBuildPolicy: 'ALWAYS',
                        results: [[path: 'allure-results']]
                    ])
                } catch (Exception e) {
                    echo "Allure report publish skipped (see jenkins/README.md): ${e}"
                }
            }

            // Reports (Cucumber HTML/JSON + Allure HTML) + failure screenshots
            // are always archived, even when the suite fails.
            archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
            archiveArtifacts artifacts: 'allure-report/**', allowEmptyArchive: true
            archiveArtifacts artifacts: 'test-results/**', allowEmptyArchive: true
        }
        success {
            echo 'All tests passed. Reports: reports/cucumber-report.html and allure-report/index.html'
        }
        failure {
            echo 'One or more tests failed - check the archived Cucumber/Allure reports and screenshots.'
        }
    }
}
