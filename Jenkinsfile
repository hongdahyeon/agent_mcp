pipeline {
    agent any

    tools {
        nodejs 'node' // Jenkins Global Tool Configuration에서 설정한 이름
    }

    environment {
        // Jenkins Node 설정(Environment variables)에서 정의한 PYTHON_EXE를 사용
        // 정의되지 않은 경우 기본값인 'python'을 사용
        PYTHON_EXE = "${env.PYTHON_EXE ?: 'python'}"
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

        stage('Automated Merge') {
            steps {
                script {
                    // 1. 소스 브랜치 결정 로직 개선
                    // 현재 빌드를 유발한 브랜치(env.GIT_BRANCH)를 최우선으로 사용합니다.
                    def rawBranchSource = env.GIT_BRANCH ?: params.SOURCE_BRANCH
                    
                    // 만약 둘 다 비어있다면(드문 경우) 기본값 'home' 사용
                    if (rawBranchSource == null || rawBranchSource == "") {
                        rawBranchSource = "home"
                    }
                    
                    // 'origin/' 접두어 제거 및 공백 정리
                    def cleanSource = rawBranchSource.replace('origin/', '').trim()
                    def cleanTarget = params.TARGET_BRANCH.trim()

                    echo ">>> Detected Build Branch (Source): ${cleanSource}"
                    echo ">>> Target Branch for Merge: ${cleanTarget}"

                    // 2. 병합 실행
                    withCredentials([usernamePassword(credentialsId: 'github-login', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                        bat """
                        @echo off
                        git config user.email "hyeon8287@gmail.com"
                        git config user.name "hong Home"
                        
                        echo Fetching latest changes...
                        git fetch origin
                        
                        echo Checking out target branch: ${cleanTarget}
                        git checkout ${cleanTarget}
                        git pull origin ${cleanTarget}
                        
                        echo Merging ${cleanSource} into ${cleanTarget}...
                        git merge origin/${cleanSource} --no-edit
                        
                        echo Pushing changes to remote...
                        git push https://%GIT_USER%:%GIT_PASS%@github.com/hongdahyeon/agent_mcp.git ${cleanTarget}
                        """
                    }
                    
                    // 3. 알림용 변수 설정 (post 단계에서 사용)
                    env.ACTUAL_SOURCE = cleanSource
                    env.ACTUAL_TARGET = cleanTarget
                }
            }
        }
    }

    post {
        success {
            echo 'Build and Automated Merge Succeeded!'
            sendTelegramNotification("CI/CD Success: Build and Automated Merge completed (${env.ACTUAL_SOURCE ?: params.SOURCE_BRANCH} -> ${env.ACTUAL_TARGET ?: params.TARGET_BRANCH})")
        }
        failure {
            echo 'Build or Merge Failed. Please check the console output.'
            sendTelegramNotification("CI/CD Failed: Error during build or merge (${env.ACTUAL_SOURCE ?: params.SOURCE_BRANCH} -> ${env.ACTUAL_TARGET ?: params.TARGET_BRANCH}). Check Jenkins logs.")
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
