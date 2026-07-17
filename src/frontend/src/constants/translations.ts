export type Language = 'ko' | 'en';

export const translations = {
  ko: {
    // Common / Layout
    dashboard: "대시보드",
    tester: "도구 테스터",
    logs: "서버 로그 보관소",
    email: "메일 발송",
    emailHistory: "메일 발송 이력",
    loginHistory: "로그인 이력",
    myPage: "내 정보",
    users: "사용자 관리",
    usageHistory: "도구 사용 이력",
    limits: "사용 제한 관리",
    customTools: "사용자 정의 도구",
    accessTokens: "보안 토큰 관리",
    schema: "DB 스키마 관리",
    config: "시스템 설정 관리",
    fileManager: "파일 관리",
    openapi: "OpenAPI 목록/테스트",
    openapiMeta: "OpenAPI 분류/태그 관리",
    openapiStats: "OpenAPI 사용 통계",
    openapiLimits: "OpenAPI 사용 제한 관리",
    dbBackup: "DB 백업 관리",
    scheduler: "스케줄러 관리",
    otpHistory: "OTP 인증 이력",
    notifications: "실시간 알림 관리",

    // Groups
    groupDashboard: "대시보드",
    groupFunctions: "기능",
    groupHistory: "이력",
    groupSystem: "설정 및 관리",

    // Header / General
    logout: "로그아웃",
    myInfo: "내 정보",
    myInfoManage: "내 정보 관리",
    themeLight: "라이트 모드로 전환",
    themeDark: "다크 모드로 전환",
    toggleSidebarCollapse: "사이드바 접기",
    toggleSidebarExpand: "사이드바 확장",
    sessionExpired: "세션이 만료되었습니다. 다시 로그인해주세요.",

    // Language Toggle
    langKo: "한국어",
    langEn: "영어",
  },
  en: {
    // Common / Layout
    dashboard: "Dashboard",
    tester: "Tool Tester",
    logs: "Server Logs Archive",
    email: "Send Email",
    emailHistory: "Email Send History",
    loginHistory: "Login History",
    myPage: "My Page",
    users: "User Management",
    usageHistory: "Tool Usage History",
    limits: "Usage Limit Management",
    customTools: "Custom Tools",
    accessTokens: "Access Token Management",
    schema: "DB Schema Management",
    config: "System Config Management",
    fileManager: "File Management",
    openapi: "OpenAPI List/Test",
    openapiMeta: "OpenAPI Categories/Tags",
    openapiStats: "OpenAPI Usage Stats",
    openapiLimits: "OpenAPI Usage Limits",
    dbBackup: "DB Backup Management",
    scheduler: "Scheduler Management",
    otpHistory: "OTP Auth History",
    notifications: "Real-time Notifications",

    // Groups
    groupDashboard: "Dashboard",
    groupFunctions: "Functions",
    groupHistory: "History",
    groupSystem: "System & Admin",

    // Header / General
    logout: "Logout",
    myInfo: "My Info",
    myInfoManage: "Manage My Info",
    themeLight: "Switch to Light Mode",
    themeDark: "Switch to Dark Mode",
    toggleSidebarCollapse: "Collapse Sidebar",
    toggleSidebarExpand: "Expand Sidebar",
    sessionExpired: "Session expired. Please log in again.",

    // Language Toggle
    langKo: "Korean",
    langEn: "English",
  }
};
