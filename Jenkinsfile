pipeline {
    agent any

    tools {
        nodejs 'node' // Node.js name registered in Jenkins 'Global Tool Configuration'
    }

    environment {
        // Project-specific GitHub repository URL (Logic below handles URL without https://)
        REPO_URL = "https://github.com/hongdahyeon/agent_mcp.git"

        // Path to python or python.exe depending on the Jenkins environment
        PYTHON_EXE = "${env.PYTHON_EXE ?: 'python'}"
    }

    parameters {
        string(name: 'SOURCE_BRANCH', defaultValue: 'home', description: 'Source branch for merging')
        string(name: 'TARGET_BRANCH', defaultValue: 'work', description: 'Target branch for the final merge')
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
                // Frontend path is src/frontend
                dir('src/frontend') {
                    echo ">>> Starting Frontend Build..."
                    bat """
                    npm install && npm run build
                    """
                }
            }
        }

        stage('Testing') {
            steps {
                echo ">>> Running Backend Tests (pytest)..."
                bat """
                venv\\Scripts\\activate && pytest tests/test_db_tool.py tests/test_dynamic_tool_loading.py tests/test_telegram_notify.py
                """
                
                echo ">>> Running Frontend Tests (vitest)..."
                dir('src/frontend') {
                    bat """
                    npm run test
                    """
                }
            }
        }

        stage('Automated Merge (Gatekeeper)') {
            steps {
                script {

                    // [Ported from Script 1] Extract logs and prevent character encoding issues in Windows
                    // chcp 65001: Change to UTF-8 code page to correctly recognize Korean commit messages
                    def fullLog = bat(script: '@echo off && chcp 65001 > nul && git log -1 --pretty=%%B', returnStdout: true).trim()
                    
                    // Remove unnecessary system output and extract only the commit message
                    def messageLines = fullLog.split('\r?\n').findAll {
                        !it.contains('git log -1') && !it.startsWith('C:\\') && !it.contains('Active code page: 65001')
                    }
                    def commitMessage = messageLines.join('\n').trim()
                    
                    // Check the branch that triggered the current build
                    def rawBranch = env.GIT_BRANCH ?: "home"
                    def currentBranch = rawBranch.replace('origin/', '').trim()
                    
                    echo ">>> Current Branch: ${currentBranch}"
                    echo ">>> Extracted Commit Message: ${commitMessage}"

                    // --- Scenario Determination Logic --- //
                    
                    // Scenario 2: Case where 'work' branch content is pulled into the current branch (Sync)
                    // => Prevent {PUSH} to 'work' branch to avoid infinite loops
                    if (commitMessage.contains('from hongdahyeon/work') || commitMessage.contains('Merge branch \'work\'')) {
                        
                        echo ">>> [Scenario 2] Sync from 'work' to '${currentBranch}' detected. Skipping Auto-Merge to prevent infinite loop."
                        env.CASE_TYPE = "SYNC_FROM_WORK"
                        env.ACTUAL_SOURCE = "work"
                        env.ACTUAL_TARGET = currentBranch
                        env.SKIP_PUSH = "true"

                    }
                    // Direct push to 'work' branch (Skip automated merge)
                    // => Prevent {PUSH} to 'work' branch to avoid infinite loops
                    else if (currentBranch == "work") {
                        
                        echo ">>> Direct push to 'work' detected. Skipping automated merge process."
                        env.CASE_TYPE = "DIRECT_WORK_PUSH"
                        env.SKIP_PUSH = "true"

                    }
                    // Scenario 1: Regular branch work followed by automated merge to 'work'
                    // => Proceed with {PUSH} to the 'work' branch
                    else {

                        echo ">>> [Scenario 1] Starting Automated Merge from '${currentBranch}' to 'work'."
                        env.CASE_TYPE = "MERGE_TO_WORK"
                        def cleanSource = currentBranch
                        def cleanTarget = "work"
                        
                        env.ACTUAL_SOURCE = cleanSource
                        env.ACTUAL_TARGET = cleanTarget
                        env.SKIP_PUSH = "false" // Proceed with final push to 'work'

                        // Secure Git Push using Credentials
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
                // Custom Telegram notification for each scenario
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
 * Function to send Telegram notifications
 * @param message Message content to send
 */
def sendTelegramNotification(String message) {
    try {
        // Use secure URL encoding method from Script 1
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