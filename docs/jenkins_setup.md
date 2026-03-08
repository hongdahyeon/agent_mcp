# Jenkins CI/CD 구축 가이드 (Windows 환경)

이 문서는 **Agent MCP** 프로젝트(Python FastAPI + React + GitHub)를 Windows 환경에서 Jenkins를 사용하여 자동 빌드 및 배포하는 방법을 설명합니다.

## 1. 사전 준비항목

Jenkins를 설치하기 전에 다음 소프트웨어들이 Windows에 설치되어 있어야 합니다.

*   **Java (JDK 11 또는 17)**: Jenkins는 Java 기반이므로 필수입니다.
*   **Python 3.12+**: 가상환경(`venv`) 생성 및 라이브러리 설치용.
*   **Node.js & npm**: React 프런트엔드 빌드용.
*   **Git**: GitHub 저장소 소스 코드 클론용.

## 2. Jenkins 설치 단계

1.  **다운로드**: [Jenkins 공식 홈페이지](https://www.jenkins.io/download/)에서 **Windows**용 설치 프로그램(.msi)을 다운로드합니다.
2.  **설치**: 다운로드한 파일을 실행하여 설치를 진행합니다.
    *   **Service Logon Credentials**: 보통 'Run service as LocalSystem'을 선택하거나 전용 계정을 설정합니다.
    *   **Port Selection**: 기본값은 `8080`입니다. 다른 포트(예: `9090`)를 원하면 변경 가능합니다.
3.  **초기 설정**:
    *   브라우저에서 `http://localhost:8080` 접속.
    *   `initialAdminPassword` 확인 (설치 경로의 `secrets` 폴더 내 존재) 후 입력.
    *   **Install suggested plugins** 선택하여 기본 플러그인 설치.

## 3. 필수 플러그인 설치

Jenkins 관리 > 플러그인 관리에서 다음을 추가 설치합니다.

*   **NodeJS Plugin**: Jenkins 내에서 Node 버전을 관리할 수 있게 해줍니다.
*   **GitHub Integration Plugin**: GitHub Webhook과 연동하기 위해 필요합니다.
*   **Pipeline**: 파이프라인 스크립트 실행을 위한 핵심 플러그인.

## 4. 파이프라인 구성 예시 (Jenkinsfile)

프로젝트 루트 디렉토리에 `Jenkinsfile`을 생성하거나 Jenkins UI에서 아래 스크립트를 파이프라인에 입력합니다.

```groovy
pipeline {
    agent any

    tools {
        nodejs 'node' // Jenkins Global Tool Configuration에서 설정한 이름
    }

    environment {
        // 시스템에 설치된 Python의 실제 경로 (Windows 환경에서 PATH 이슈 방지)
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

        stage('Deploy') {
            steps {
                echo 'Deploying Agent MCP...'
                // 빌드된 파일 이동 또는 서버 재시작 로직
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
```

> [!TIP]
> Windows 시스템에서 Jenkins 서비스 계정이 Python 경로를 찾지 못할 경우, `environment` 블록에 Python 실행 파일의 절대 경로를 직접 지정해 주면 안정적으로 실행됩니다.

## 5. Jenkins UI 설정 (SCM)

파이프라인 프로젝트의 상세 설정에서 다음 항목을 입력합니다.

*   **Definition**: `Pipeline script from SCM`
*   **SCM**: `Git`
*   **Repository URL**: `https://github.com/hongdahyeon/agent_mcp`
*   **Branch Specifier**: `*/home`
*   **Script Path**: `Jenkinsfile`
*   **빌드 유발 (Build Triggers)**: `GitHub hook trigger for GITScm polling` 체크 (이게 되어 있어야 Webhook이 작동합니다!)

## 6. Webhook Accessibility (ngrok)

로컬 환경의 Jenkins를 GitHub이 인식할 수 있도록 외부로 노출합니다.

1.  **ngrok 설치**: [ngrok 홈페이지](https://ngrok.com/)에서 다운로드 후 설치.
2.  **인증**: `ngrok config add-authtoken <TOKEN>` 실행 (회원가입 후 확인 가능).
3.  **실행**: 터미널에서 `ngrok http 9090` 실행 (포트번호는 Jenkins 설정에 맞춤).
4.  **GitHub Webhook 등록**:
    *   **Payload URL**: `https://<ngrok-ID>.ngrok-free.app/github-webhook/`
    *   **Content type**: `application/json`
    *   **Events**: `Just the push event` 선택

이제 GitHub에 코드를 `push`할 때마다 Jenkins가 자동으로 빌드를 시작합니다.

(테스트 라인)