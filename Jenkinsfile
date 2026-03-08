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
                // 'github-login'은 Jenkins Credentials에서 생성한 ID입니다.
                withCredentials([usernamePassword(credentialsId: 'github-login', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                    bat """
                    git config user.email "hyeon8287@gmail.com"
                    git config user.name "hong Home"
                    git fetch origin
                    git checkout work
                    git pull origin work
                    git merge origin/home --no-edit
                    // 토큰 정보를 포함한 HTTPS 주소로 푸시
                    git push https://%GIT_USER%:%GIT_PASS%@github.com/hongdahyeon/agent_mcp.git work
                    """
                }
            }
        }
    }

    post {
        success {
            echo 'Build and Automated Merge Succeeded!'
            sendTelegramNotification("✅ CI/CD 성공: 빌드 및 자동 머지 완료 (home -> work)")
        }
        failure {
            echo 'Build or Merge Failed. Please check the console output.'
            sendTelegramNotification("❌ CI/CD 실패: 빌드 또는 머지 중 오류가 발생했습니다. Jenkins 로그를 확인하세요.")
        }
    }
}

// 텔레그램 알림을 보내는 헬퍼 함수
def sendTelegramNotification(String message) {
    withCredentials([string(credentialsId: 'telegram-token', variable: 'TOKEN'),
                     string(credentialsId: 'telegram-chat-id', variable: 'CHAT_ID')]) {
        bat "curl -s -X POST https://api.telegram.org/bot${TOKEN}/sendMessage -d chat_id=${CHAT_ID} -d text=\"${message}\""
    }
}
