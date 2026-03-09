pipeline {
    agent any

    tools {
        nodejs 'node' // Jenkins Global Tool Configuration에서 설정한 이름
    }

    environment {
        // 시스템에 설치된 Python의 실제 경로로 수정 (where python 명령어로 확인한 경로)
        // 테스트 체크 사용 안함
        PYTHON_EXE = 'C:\\Users\\user\\AppData\\Local\\Programs\\Python\\Python312\\python.exe'
    }

    parameters {
        string(name: 'SOURCE_BRANCH', defaultValue: 'home', description: 'Source branch to merge from (e.g., home, note)')
        string(name: 'TARGET_BRANCH', defaultValue: 'work', description: 'Target branch to merge into (e.g., work)')
    }

    stages {
        // stage('Backend Setup') {
        //     steps {
        //         bat """
        //         if not exist venv (
        //             "%PYTHON_EXE%" -m venv venv
        //         )
        //         venv\\Scripts\\activate && pip install -r requirements.txt
        //         """
        //     }
        // }
        stage('Backend Setup') {
            steps {
                bat """
                @echo off
                :: 시스템에 설치된 python을 사용하거나, Jenkins 환경 변수를 활용하세요
                python -m venv venv
                if errorlevel 1 exit /b 1
                
                :: 가상환경 활성화 후 패키지 설치
                call venv\\Scripts\\activate
                pip install -r requirements.txt
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

        stage('Automated Merge') {
            steps {
                // 'github-login'은 Jenkins Credentials에서 생성한 ID입니다.
                withCredentials([usernamePassword(credentialsId: 'github-login', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                    bat """
                    git config user.email "hyeon8287@gmail.com"
                    git config user.name "hong Home"
                    git fetch origin
                    git checkout ${params.TARGET_BRANCH}
                    git pull origin ${params.TARGET_BRANCH}
                    git merge origin/${params.SOURCE_BRANCH} --no-edit
                    git push https://%GIT_USER%:%GIT_PASS%@github.com/hongdahyeon/agent_mcp.git ${params.TARGET_BRANCH}
                    """
                }
            }
        }
    }

    post {
        success {
            echo 'Build and Automated Merge Succeeded!'
            sendTelegramNotification("CI/CD Success: Build and Automated Merge completed (${params.SOURCE_BRANCH} -> ${params.TARGET_BRANCH})")
        }
        failure {
            echo 'Build or Merge Failed. Please check the console output.'
            sendTelegramNotification("CI/CD Failed: Error during build or merge (${params.SOURCE_BRANCH} -> ${params.TARGET_BRANCH}). Check Jenkins logs.")
        }
    }
}

// 텔레그램 알림을 보내는 헬퍼 함수
def sendTelegramNotification(String message) {
    try {
        withCredentials([string(credentialsId: 'telegram-token', variable: 'TOKEN'),
                         string(credentialsId: 'telegram-chat-id', variable: 'CHAT_ID')]) {
            bat "curl -s -X POST https://api.telegram.org/bot${TOKEN}/sendMessage -d chat_id=${CHAT_ID} -d text=\"${message}\""
        }
    } catch (Exception e) {
        echo "Telegram 알림 전송 실패: ${e.getMessage()}"
    }
}
