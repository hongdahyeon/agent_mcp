// 사용량 제한 뱃지 컴포넌트
export interface UsageData {
    usage: number;
    limit: number;
    remaining: number;
}

export interface UsageLog {
    id: number;
    tool_nm: string;
    tool_params: string;
    tool_success: string; // 'SUCCESS' | 'FAIL'
    tool_result: string;
    reg_dt: string;
    user_id: string;
    user_nm: string;
}

export interface UsageStats {
    user_id: string;
    user_nm: string;
    role: string;
    usage: number;
    limit: number;
    remaining: number;
}

export interface UsageHistoryResponse {
    total: number;
    page: number;
    size: number;
    items: UsageLog[];
}

export interface MyMcpUsage {
    usage: number;
    limit: number;
    remaining: number;
    tool_usage: { tool_nm: string; cnt: number }[];
}