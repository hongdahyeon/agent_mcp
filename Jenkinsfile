pipeline {
    agent any

    tools {
        nodejs 'node' // Jenkins 'Global Tool Configuration'에 등록된 Node.js 이름
    }

    environment {
        // 프로젝트별 GitHub 저장소 URL (https:// 제외하고 처리하도록 하단 로직 구성)
        REPO_URL = "https://github.com/hongdahyeon/agent_mcp.git"

        // Jenkins 실행 환경에 따라 python 또는 python.exe 경로 지정
        PYTHON_EXE = "${env.PYTHON_EXE ?: 'python'}"
    }

    parameters {
        string(name: 'SOURCE_BRANCH', defaultValue: 'home', description: '머지 대상이 되는 소스 브랜치')
        string(name: 'TARGET_BRANCH', defaultValue: 'work', description: '최종 머지될 타겟 브랜치')
    }

    stages {
        stage('Backend Setup & Requirements') {
            steps {
                echo ">>> Setting up Python Virtual Environment..."
                bat """
                @echo off
                if not exist venv (
                    "%PYTHON_EXE%" -m venv venv
                )
                venv\\Scripts\\activate && pip install -r requirements.txt
                """
            }
        }

        stage('Frontend Build') {
            steps {
                // 프론트엔드 경로가 src/frontend인 점 반영
                dir('src/frontend') {
                    echo ">>> Starting Frontend Build..."
                    bat """
                    npm install && npm run build
                    """
                }
            }
        }

        stage('Automated Merge (Gatekeeper)') {
            steps {
                script {

                    // [1번 스크립트 핵심 이식] Windows 환경 한글 깨짐 방지 및 로그 추출
                    // chcp 65001: UTF-8 코드페이지로 변경하여 한글 커밋 메시지 정상 인식
                    def fullLog = bat(script: '@echo off && chcp 65001 > nul && git log -1 --pretty=%%B', returnStdout: true).trim()
                    
                    // 불필요한 시스템 출력 라인을 제거하고 순수 커밋 메시지만 추출
                    def messageLines = fullLog.split('\r?\n').findAll {
                        !it.contains('git log -1') && !it.startsWith('C:\\') && !it.contains('Active code page: 65001') 
                    }
                    def commitMessage = messageLines.join('\n').trim()
                    
                    // 현재 빌드를 유발한 브랜치명 확인
                    def rawBranch = env.GIT_BRANCH ?: "home"
                    def currentBranch = rawBranch.replace('origin/', '').trim()
                    
                    echo ">>> Current Branch: ${currentBranch}"
                    echo ">>> Extracted Commit Message: ${commitMessage}"

                    // --- 시나리오 판별 로직 --- //
                    
                    // Scenario 2: 타겟 브랜치(work)의 내용을 현재 브랜치로 가져온 경우 (동기화)
                    // => 해당 경우에는 타겟 브랜치(work)로의 {PUSH}를 막아 무한 루프를 방지
                    if (commitMessage.contains('from hongdahyeon/work') || commitMessage.contains("Merge branch 'work'")) {
                        
                        echo ">>> Scenario 2: Sync from 'work' to '${currentBranch}' detected. Skipping Auto-Merge."
                        env.CASE_TYPE = "SYNC_FROM_WORK"
                        env.ACTUAL_SOURCE = "work"
                        env.ACTUAL_TARGET = currentBranch
                        env.SKIP_PUSH = "true"

                    }
                    // 직접 'work' 브랜치에 푸시한 경우 (자동 머지 생략)
                    // => 해당 경우에는 타겟 브랜치(work)로의 {PUSH}를 막아 무한 루프를 방지
                    else if (currentBranch == "work") {
                        
                        echo ">>> Direct push to 'work' detected. Skipping automated merge."
                        env.CASE_TYPE = "DIRECT_WORK_PUSH"
                        env.SKIP_PUSH = "true"

                    }
                    // Scenario 1: 일반 브랜치에서 작업 후 'work'로 자동 머지 진행
                    // => 해당 경우에는 타겟 브랜치(work)로의 {PUSH}를 진행
                    else {

                        echo ">>> Scenario 1: Automated Merge from '${currentBranch}' to 'work' detected."
                        env.CASE_TYPE = "MERGE_TO_WORK"
                        def cleanSource = currentBranch
                        def cleanTarget = "work"
                        
                        env.ACTUAL_SOURCE = cleanSource
                        env.ACTUAL_TARGET = cleanTarget
                        env.SKIP_PUSH = "false"

                        // Credentials를 이용한 안전한 Git Push
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
                            git push https://%GIT_USER%:%GIT_PASS%@${env.REPO_URL.replace('https://', '')} ${cleanTarget}
                            """
                        }
                    }
                }
            }
        }
    }

    post {
        success {
            script {
                def now = new Date().format("yyyy-MM-dd HH:mm", TimeZone.getTimeZone('Asia/Seoul'))
                // 상황별 맞춤형 텔레그램 알림
                if (env.CASE_TYPE == "SYNC_FROM_WORK") {
                    sendTelegramNotification("[${now}][V] CI/CD Success: Sync from work completed (${env.ACTUAL_SOURCE} -> ${env.ACTUAL_TARGET})")
                
                } else if (env.CASE_TYPE == "MERGE_TO_WORK") {
                    sendTelegramNotification("[${now}][V] CI/CD Success: Build and Automated Merge completed (${env.ACTUAL_SOURCE} -> ${env.ACTUAL_TARGET})")
                
                } else {
                    sendTelegramNotification("[${now}][V] CI/CD Success: Build completed (${env.GIT_BRANCH ?: 'unknown'})")
                
                }
            }
        }
        failure {
            script {
                def now = new Date().format("yyyy-MM-dd HH:mm", TimeZone.getTimeZone('Asia/Seoul'))
                sendTelegramNotification("[${now}][X] CI/CD Failed: Error during pipeline execution. Check Jenkins logs.")
            }
        }
    }
}

/**
 * 텔레그램 알림 전송 함수
 * @param message 전송할 메시지 내용
 */
def sendTelegramNotification(String message) {
    try {
        // 1번 스크립트의 안전한 URL 인코딩 방식 사용
        withCredentials([string(credentialsId: 'telegram-token', variable: 'TOKEN'),
                         string(credentialsId: 'telegram-chat-id', variable: 'CHAT_ID')]) {
            bat """
            @echo off
            curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" ^
            -d "chat_id=${CHAT_ID}" ^
            --data-urlencode "text=${message}"
            """
        }
    } catch (Exception e) {
        echo "Telegram notification failed: ${e.getMessage()}"
    }
}