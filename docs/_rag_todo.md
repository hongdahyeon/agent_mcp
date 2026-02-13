# RAG 이용에 앞서...

---

## 1. RAG 구현 우선순위 (Immediate To-Do)

가장 먼저 인프라 구축 및 S3 연동부터 시작합니다.

### 1단계: 인프라 구축 (Infrastructure) <!-- id: 51 -->
- [ ] `docker-compose.yml` 실행 및 스토리지 기동 (SeaweedFS, MinIO)
- [ ] `boto3` 라이브러리 설치 및 연동 테스트

### 2단계: StorageService 구현 (Python) <!-- id: 52 -->
- [ ] `src/utils/storage.py` 생성 (파일 업로드/다운로드 로직)
- [ ] 환경 변수(`config`) 설정

### 3단계: 문서 관리 기능 (Frontend/Backend) <!-- id: 53 -->
- [ ] 프론트엔드 문서 업로드 UI
- [ ] 백엔드 업로드 API 및 S3 저장 로직

---

## 2. RAG 개념 이해

### [1] RAG란?
- AI가 학습하지 않은 최신 정보나 내부 보안 데이터(문서, DB 등)을 실시간으로 찾아내어 답변에 반영

### [2] RAG의 장점
1. **데이터 전처리**: pdf, Excel, 내부 문서 등을 AI가 이해하기 좋은 형태로 쪼개고 정제하는 작업
2. **벡터 데이터베이스 연동**: ChromaDB, Pinecone, Milvus 같이 데이터를 저장하고 검색할 공간 구축
3. **검색 알고리즘 최적화**: 단순히 비슷한 단어를 찾는 것을 넘어, 질문의 의도를 파악하고 정확한 문서를 가져오는 로직 구현
4. **MCP 도구화**: 현재 우리가 만든 구조 안에 **문서 지식창고 검색 툴**을 추가해, AI 에이전트가 필요할 때마다 내부 매뉴얼이나 가이드를 읽고 처리하게 만드는 작업

---

## 3. RAG 구현 로드맵 (Detailed Roadmap)

### 1단계: 인프라 및 스토리지 연동 (Infrastructure)
- **S3 연동**: 원본 문서(PDF, Docx 등)를 안전하게 보관할 오브젝트 스토리지 구축
- **Vector DB 준비**: 검색된 벡터를 저장할 공간 (ChromaDB 등) 설정

### 2단계: 문서 업로드 및 전처리 (Ingestion & Preprocessing)
- **텍스트 추출 (Parsing)**: 문서 타입별로 텍스트 데이터 추출
- **청킹 (Chunking)**: AI가 읽기 적당한 크기(예: 500~1000자)로 문서를 분할

### 3단계: RAG화 - 임베딩 (Embedding)
- **벡터화**: 분할된 텍스트 조각들을 숫자(Vector)로 변환 (OpenAI 임베딩 등 사용)

### 4단계: 벡터 DB 저장 및 색인 (Indexing)
- 변환된 벡터와 메타데이터를 벡터 DB에 매핑하여 저장

### 5단계: Retrieval & Generation (조회 및 답변)
- 질문을 벡터로 변환 후 유사 문서 검색 및 LLM 답변 생성

---

## 4. Python 기반 기술 스택 제안 (Boto3)

Java와 비교했을 때 Python의 `boto3`를 사용하면 다음과 같이 훨씬 간결해집니다.

```python
import boto3
from botocore.client import Config

# 클라이언트 생성
s3 = boto3.client(
    's3',
    endpoint_url='http://127.0.0.1:18333', # SeaweedFS 예시
    aws_access_key_id='admin',
    aws_secret_access_key='admin1234',
    config=Config(signature_version='s3v4')
)

# 파일 업로드
s3.upload_file('local_file.pdf', 'my-bucket', 'docs/file.pdf')
```