export interface OpenApiUsageLog {
    id: number;
    user_uid: number | null;
    token_id: number | null;
    tool_id: string;
    method: string;
    url: string;
    status_code: number;
    success: 'SUCCESS' | 'FAIL';
    error_msg: string | null;
    reg_dt: string;
    ip_addr: string | null;
    user_id?: string;
    user_nm?: string;
    token_name?: string;
}

export interface OpenApiLimit {
    id: number;
    target_type: 'ROLE' | 'USER' | 'TOKEN';
    target_id: string;
    max_count: number;
    description: string | null;
    reg_dt: string;
}

export interface OpenApiStats {
    resultStats: { success: string; cnt: number }[];
    toolStats: { tool_id: string; cnt: number }[];
    userStats: { label: string; cnt: number }[];
}

export interface MyOpenApiUsage {
    usage: number;
    limit: number;
    remaining: number;
    tool_usage: { tool_id: string; cnt: number }[];
}
