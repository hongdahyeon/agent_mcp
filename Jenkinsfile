pipeline {
    agent any

    tools {
        nodejs 'node' // Jenkins Global Tool Configuration에서 설정한 이름
    }

    stages {
        stage('Backend Setup') {
            steps {
                bat """
                if not exist venv (
                    py -3.12 -m venv venv
                )
                venv\\Scripts\\activate && pip install -r requirements.txt
                """
            }
        }

        stage('Frontend Build') {
            steps {
                dir('src/frontend') {
                    bat "npm install"
                    bat "npm run build"
                }
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying Agent MCP...'
            }
        }
    }

    post {
        success {
            echo 'Build and Deployment Succeeded!'
        }
        failure {
            echo 'Build Failed. Please check the console output.'
        }
    }
}
