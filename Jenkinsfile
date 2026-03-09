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
                    // 1. 빌드 상황 파악 (커밋 메시지 분석)
                    // bat의 결과에는 실행된 명령어 라인이 포함될 수 있으므로, 실제 메시지 부분만 필터링합니다.
                    def fullLog = bat(script: 'git log -1 --pretty=%%B', returnStdout: true).trim()
                    
                    // 명령어 라인(C:\...)을 제외한 실제 커밋 메시지 본문만 추출
                    def messageLines = fullLog.split('\r?\n').findAll { !it.contains('git log -1') && !it.startsWith('C:\\') }
                    def commitMessage = messageLines.join('\n').trim()
                    
                    def rawBranch = env.GIT_BRANCH ?: "home"
                    def currentBranch = rawBranch.replace('origin/', '').trim()
                    
                    echo ">>> Current Branch: ${currentBranch}"
                    echo ">>> Extracted Commit Message: ${commitMessage}"

                    // 시나리오 판별
                    if (currentBranch == 'work') {
                        // case 0: work 브랜치 자체 빌드 (일반적으로는 병합 생략)
                        echo ">>> Build on 'work' branch. Skipping automated merge."
                        env.CASE_TYPE = "WORK_SELF"
                        env.SKIP_PUSH = "true"
                        return
                    } else if (commitMessage.contains('from hongdahyeon/work') || commitMessage.contains('Merge branch \'work\'')) {
                        // 시나리오 2: work -> Feature (Sync)
                        echo ">>> Scenario 2: Sync from 'work' to '${currentBranch}' detected."
                        env.CASE_TYPE = "SYNC_FROM_WORK"
                        env.ACTUAL_SOURCE = "work"
                        env.ACTUAL_TARGET = currentBranch
                        env.SKIP_PUSH = "true"
                        return
                    } else {
                        // 시나리오 1: Feature -> work (Automated Merge)
                        echo ">>> Scenario 1: Automated Merge from '${currentBranch}' to 'work' detected."
                        env.CASE_TYPE = "MERGE_TO_WORK"
                        def cleanSource = currentBranch
                        def cleanTarget = "work"
                        
                        env.ACTUAL_SOURCE = cleanSource
                        env.ACTUAL_TARGET = cleanTarget
                        env.SKIP_PUSH = "false"

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
                    }
                }
            }
        }
    }

    post {
        success {
            script {
                if (env.CASE_TYPE == "SYNC_FROM_WORK") {
                    echo 'Sync from work completed.'
                    sendTelegramNotification("CI/CD Success: Sync from work completed (${env.ACTUAL_SOURCE} -> ${env.ACTUAL_TARGET})")
                } else if (env.CASE_TYPE == "MERGE_TO_WORK") {
                    echo 'Automated Merge Succeeded!'
                    sendTelegramNotification("CI/CD Success: Build and Automated Merge completed (${env.ACTUAL_SOURCE} -> ${env.ACTUAL_TARGET})")
                } else {
                    echo 'Build Succeeded (No special merge scenario).'
                }
            }
        }
        failure {
            echo 'Build or Merge Failed.'
            sendTelegramNotification("CI/CD Failed: Error during pipeline execution. Check Jenkins logs.")
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
