pipeline {
  agent any

  options {
    timestamps()
    timeout(time: 45, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  parameters {
    booleanParam(name: 'RUN_MOBILE', defaultValue: true, description: 'Run mobile (Appium) tests')
    booleanParam(name: 'RUN_WEB',    defaultValue: false, description: 'Run web (Playwright) tests')
  }

  stages {
    stage('Checkout') { steps { checkout scm } }

    stage('Install') { steps { bat 'npm ci || npm install' } }

    stage('Playwright deps') {
      when { expression { params.RUN_WEB } }
      steps { bat 'npm run playwright:install' }
    }

    stage('Start Appium') {
      when { expression { params.RUN_MOBILE } }
      steps {
        bat 'start /b appium --base-path / > target\\appium.log 2>&1'
        bat 'powershell -Command "Start-Sleep -Seconds 8"'
      }
    }

    stage('PayTo') {
      when { expression { params.RUN_MOBILE } }
      steps { bat 'npm run test:payto' }
    }

    stage('Login') {
      when { expression { params.RUN_MOBILE } }
      steps { bat 'npm run test:login' }
    }

    stage('Web') {
      when { expression { params.RUN_WEB } }
      steps { bat 'npm run test:web' }
    }

    stage('Report') { steps { bat 'npm run report' } }
  }

  post {
    always {
      archiveArtifacts artifacts: 'target/**', allowEmptyArchive: true
      publishHTML(target: [
        allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true,
        reportDir: 'target', reportFiles: 'cucumber-html.html',
        reportName: 'Cucumber Report'
      ])
    }
  }
}
