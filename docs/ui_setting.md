# UI/UX 표준 가이드 (UI Setting Guide)

본 문서는 Agent MCP 프로젝트의 프론트엔드 UI 일관성을 유지하기 위한 디자인 및 개발 표준을 정의합니다. 새로운 화면을 생성하거나 기존 화면을 수정할 때 이 가이드를 준수합니다.

---

## 1. 기본 레이아웃 (Page Layout)

모든 주메뉴 화면은 고정된 헤더와 스크롤 가능한 컨텐츠 영역으로 구성됩니다.

- **컨테이너**: `h-full flex flex-col space-y-4` (App.tsx의 padding 8과 조합됨)
- **헤더 (Header)**:
  - 스타일: `bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center`
  - 아이콘: `p-2 rounded-lg bg-blue-50` 안에 `Lucide` 아이콘 배치 (주로 `text-blue-600`)
  - 제목: `text-xl font-bold text-gray-800`
  - 부제목: `text-sm text-gray-500 mt-1` (필요 시)

```tsx
<header className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
  <div className="flex items-center space-x-3">
    <div className="p-2 rounded-lg bg-blue-50">
      <IconName className="w-6 h-6 text-blue-600" />
    </div>
    <div>
      <h2 className="text-xl font-bold text-gray-800">화면 제목</h2>
      <p className="text-sm text-gray-500 mt-1">설명 문구...</p>
    </div>
  </div>
  {/* 우측 액션 버튼 등 */}
</header>
```

---

## 2. 테이블 디자인 (Table Standard)

데이터 목록은 **Sticky Header**와 **내부 스크롤**이 적용된 테이블 형식을 따릅니다.

- **래퍼 (Wrapper)**: `flex-1 flex flex-col min-h-0 bg-white shadow rounded-lg overflow-hidden border border-gray-200`
- **테이블 컨테이너**: `overflow-x-auto flex-1`
- **헤더 (`<thead>`)**: `bg-gray-50 sticky top-0 z-10`
- **행 (`<tr>`)**: `hover:bg-gray-50 transition-colors`
- **셀 (`<td>`, `<th>`)**: 텍스트 생략 시 `truncate max-w-xs`와 `title` 속성 활용

```tsx
<div className="flex-1 flex flex-col min-h-0 bg-white shadow rounded-lg overflow-hidden border border-gray-200">
  <div className="overflow-x-auto flex-1">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50 sticky top-0 z-10">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">컬럼명</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        <tr className="hover:bg-gray-50 transition-colors">
          <td className="px-6 py-4 text-sm text-gray-900">데이터</td>
        </tr>
      </tbody>
    </table>
  </div>
  {/* 하단 페이지네이션 위치 */}
</div>
```

---

## 3. 페이지네이션 (Pagination)

모든 목록 화면 하단에 공통 `Pagination` 컴포넌트를 배치합니다.

- **컴포넌트**: `src/components/common/Pagination.tsx`
- **패턴**: `fetch` API 호출 시 `page`와 `pageSize`를 파라미터로 전달

```tsx
<div className="bg-white border-t border-gray-200">
  <Pagination
    currentPage={page}
    totalPages={Math.ceil(totalItems / pageSize)}
    pageSize={pageSize}
    totalItems={totalItems}
    onPageChange={(p) => setPage(p)}
    onPageSizeChange={(s) => {
      setPageSize(s);
      setPage(1);
    }}
  />
</div>
```

---

## 4. 모달 디자인 (Modal - Glassmorphism)

모달 배경은 뒷배경이 흐릿하게 보이는 Glassmorphism 효과를 적용합니다.

- **배경 (Backdrop)**: `fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4`
- **컨텐츠 카드**: `bg-white rounded-lg shadow-xl animate-fade-in`

---

## 5. 이벤트 및 데이터 호출 (Events & Fetch)

React Hook의 최적화와 에러 핸들링을 위한 규칙입니다.

- **컴포넌트 내 함수**: API 호출 함수는 반드시 `useCallback`으로 감싸고, `useEffect`의 의존성 배열에 포함시킵니다.
- **에러 핸들링**: `try-catch` 블록 내에서 `err as Error` 타입을 명시하여 에러 메시지를 처리합니다.
- **인증 헤더**: 모든 API 호출 시 `getAuthHeaders()`를 사용합니다.

```tsx
const fetchData = useCallback(async (pageNum = page, size = pageSize) => {
  setLoading(true);
  try {
    const res = await fetch(`/api/...`, { headers: getAuthHeaders() });
    // ... 처리
  } catch (err) {
    const error = err as Error;
    setError(error.message);
  } finally {
    setLoading(false);
  }
}, [page, pageSize]);

useEffect(() => {
  fetchData();
}, [fetchData]);
```

---

## 6. 주요 색상 및 스타일 토큰

- **Primary**: `blue-600` (#2563eb)
- **Background**: `gray-50` (전체 배경), `white` (카드/헤더)
- **Border**: `gray-200` or `gray-100`
- **Shadow**: `shadow-sm` (기본 카드), `shadow-xl` (모달)
- **Radius**: `rounded-xl` (헤더/메인카드), `rounded-lg` (버튼/테이블)
