// Jenkins CI/CD pipeline for the Playwright + Cucumber + TypeScript framework.
// Repo: https://github.com/muhti46/zinc-bank-test-framework (public) - branch main.
//
// Jenkins prerequisites (see jenkins/README.md):
//   - Plugins: Pipeline, Git, NodeJS, Timestamper, Build Discarder,
//     Allure Jenkins Plugin, HTML Publisher, Email Extension (email-ext)
//   - Global Tool Configuration: NodeJS installation named "NodeJS"
//   - Credentials (Secret text) created from your .env values - never committed:
//       zincbank-app-username
//       zincbank-app-password
//       zincbank-app-invalid-username
//       zincbank-app-invalid-password
//       zincbank-app-error-text
//
// Triggers:
//   - Manual: "Build with Parameters" (choose TEST_SUITE: full, smoke, or regression)
//   - SCM polling every 5 min picks up pushed changes (localhost controller
//     cannot receive GitHub webhooks) and runs the full suite.
//   - Scheduled runs: Optional. For weekday smoke (08:00) and regression (17:00)
//     builds, create separate Jenkins jobs or add cron triggers (see jenkins/README.md).

pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 60, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10', artifactNumToKeepStr: '5'))
        disableConcurrentBuilds()
    }

    triggers {
        // Weekday 08:00 (controller local time) smoke run - the scheduled
        // build always runs the morning smoke suite (hour < 12 -> smoke) and
        // post{} e-mails the report to the configured default recipients.
        cron('0 8 * * 1-5')
        // SCM polling: check for pushed changes every 5 minutes and run the full suite.
        pollSCM('H/5 * * * *')
    }

    parameters {
        choice(
            name: 'TEST_SUITE',
            choices: ['full', 'smoke', 'regression'],
            description: 'Which suite to run? full = all scenarios; smoke = @smoke-tagged; regression = @regression-tagged. The scheduled weekday builds ALWAYS run their fixed suite regardless of this value (08:00 = smoke, 17:00 = regression).'
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
                        // Scheduled weekday builds ALWAYS run their fixed suite:
                        // the 08:00 cron fires smoke, the 17:00 cron fires
                        // regression (both Mon-Fri). Manual "Build with
                        // Parameters" and SCM-poll builds use TEST_SUITE.
                        def isScheduled = !(currentBuild.getBuildCauses('hudson.triggers.TimerTrigger$TimerTriggerCause') ?: []).isEmpty()
                        def suite
                        if (isScheduled) {
                            suite = new Date().getHours() < 12 ? 'smoke' : 'regression'
                        } else {
                            suite = params.TEST_SUITE ?: 'full'
                        }
                        def testCmd = suite == 'smoke' ? 'npm run test:smoke' : (suite == 'regression' ? 'npm run test:regression' : 'npm test')
                        echo "Running suite: ${suite} -> ${testCmd}"
                        // Run the tests, then ALWAYS build BOTH reports (Cucumber
                        // HTML + Allure HTML), but keep the Cucumber exit code so
                        // a failing suite stays red.
                        bat """
                            call ${testCmd}
                            set TEST_EXIT=%errorlevel%
                            call npm run report:generate
                            call npm run report:allure:generate
                            exit /b %TEST_EXIT%
                        """
                    }
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
                        commandline: 'allure',
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

            // Daily scheduled e-mail: sent only for the weekday 08:00 (smoke)
            // and 17:00 (regression) cron triggers, so manual/push builds
            // don't spam the inbox.
            // Primary: Email Extension plugin (emailext, HTML body + report
            // attachment). Fallback: plain mail step. Both use the Jenkins
            // global "default recipients", so no address is committed here -
            // configure SMTP + recipients in Manage Jenkins -> Configure System
            // (see jenkins/README.md, "Daily report e-mail").
            script {
                def isScheduled = !(currentBuild.getBuildCauses('hudson.triggers.TimerTrigger$TimerTriggerCause') ?: []).isEmpty()
                if (isScheduled) {
                    def suite = new Date().getHours() < 12 ? 'smoke' : 'regression'
                    def suiteTitle = suite.capitalize()
                    def suiteLabel = suite == 'smoke' ? 'smoke (@smoke-tagged scenarios)' : 'regression (@regression-tagged scenarios)'
                    def subject = "[Jenkins] ${suiteTitle} report ${env.JOB_NAME} #${env.BUILD_NUMBER} - ${currentBuild.currentResult}"
                    def body = """
                        <html><body>
                        <h2>${suiteTitle} test report - ${env.JOB_NAME} #${env.BUILD_NUMBER}</h2>
                        <p><b>Suite:</b> ${suiteLabel}</p>
                        <p><b>Result:</b> <span style="color:${currentBuild.currentResult == 'SUCCESS' ? 'green' : 'red'};font-weight:bold">${currentBuild.currentResult}</span></p>
                        <p><b>Build:</b> <a href="${env.BUILD_URL}">${env.BUILD_URL}</a></p>
                        <h3>Reports</h3>
                        <ul>
                            <li>Cucumber HTML report (attached): <a href="${env.BUILD_URL}artifact/reports/cucumber-report.html">cucumber-report.html</a></li>
                            <li>Allure report: <a href="${env.BUILD_URL}allure/">Allure Report</a></li>
                            <li>Console log (attached)</li>
                        </ul>
                        <p>Failure screenshots (if any) are attached as PNG files.</p>
                        </body></html>
                    """
                    try {
                        emailext(
                            to: '$DEFAULT_RECIPIENTS',
                            subject: subject,
                            mimeType: 'text/html',
                            attachLog: true,
                            attachmentsPattern: 'reports/cucumber-report.html,test-results/screenshots/*.png',
                            body: body
                        )
                    } catch (Exception e) {
                        echo "emailext failed (${e}); trying the plain mail step."
                        try {
                            mail(
                                to: '$DEFAULT_RECIPIENTS',
                                subject: subject,
                                body: "${suiteTitle} report for ${env.JOB_NAME} #${env.BUILD_NUMBER}: ${currentBuild.currentResult}. See ${env.BUILD_URL}"
                            )
                        } catch (Exception e2) {
                            echo "E-mail could not be sent (${e2}) - configure SMTP + default recipients in Manage Jenkins -> Configure System."
                        }
                    }
                }
            }

            // Desktop convenience on the LOCAL controller: after EVERY completed
            // build (manual, cron or SCM-poll) pop the freshly built reports on
            // the logged-in desktop. Jenkins runs as a Windows service in
            // session 0, so a plain `start` would be invisible - instead we
            // trigger the interactive 'zincbank-open-reports' scheduled task
            // (registered in the user's session; see jenkins/README.md). That
            // task opens the Cucumber HTML file and this build's Allure-plugin
            // URL (Allure renders blank when opened as a file:// page).
            // Best-effort only: a problem here must never flip the build result.
            script {
                try {
                    bat '''
                        powershell -NoProfile -Command "$ErrorActionPreference='Stop'; $ws = $env:WORKSPACE; if (-not $ws) { $ws = (Get-Location).Path }; $base = if ($env:JENKINS_URL) { $env:JENKINS_URL } else { 'http://localhost:8080/' }; $req = @{ cucumberHtml = Join-Path $ws 'reports\\cucumber-report.html'; allureUrl = ($base + 'job/' + $env:JOB_NAME + '/' + $env:BUILD_NUMBER + '/allure/'); allureHtml = Join-Path $ws 'allure-report\\index.html'; buildNumber = $env:BUILD_NUMBER } | ConvertTo-Json; Set-Content -Path (Join-Path $ws 'open-reports-request.json') -Value $req -Encoding UTF8"
                        schtasks /run /tn "zincbank-open-reports"
                        exit /b 0
                    '''
                } catch (Exception e) {
                    echo "Desktop auto-open skipped (not fatal): ${e}"
                }
            }
        }
        success {
            echo 'All tests passed. Reports: reports/cucumber-report.html and allure-report/index.html'
        }
        failure {
            echo 'One or more tests failed - check the archived Cucumber/Allure reports and screenshots.'
        }
    }
}
