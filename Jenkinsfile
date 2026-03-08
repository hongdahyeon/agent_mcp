pipeline {
    agent any

    tools {
        nodejs 'node' // Jenkins Global Tool Configuration에서 설정한 이름
    }

    environment {
        // 시스템에 설치된 Python의 실제 경로로 수정 (where python 명령어로 확인한 경로)
        PYTHON_EXE = 'C:\\Users\\user\\AppData\\Local\\Programs\\Python\\Python312\\python.exe'
    }

    stages {
        stage('Backend Setup') {
            steps {
                bat """
                if not exist venv (
                    "%PYTHON_EXE%" -m venv venv
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

        stage('Merge to work') {
            steps {
                bat """
                git config user.email "hyeon8287@gmail.com"
                git config user.name "hong Home"
                git fetch origin
                git checkout work
                git pull origin work
                git merge origin/home --no-edit
                git push origin work
                """
            }
        }
    }

    post {
        success {
            echo 'Build and Automated Merge Succeeded!'
        }
        failure {
            echo 'Build or Merge Failed. Please check the console output.'
        }
    }
}
