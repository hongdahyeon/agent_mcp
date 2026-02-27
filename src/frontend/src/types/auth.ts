/* 
*  사용자 정보/로그인 관련 데이터 타입 정의
*/
export interface User {
    uid?: number;
    user_id: string;
    user_nm: string;
    user_email: string;
    role: string;
    is_enable?: string;
    is_locked?: string;
    is_delete?: string;
    is_approved?: string;
    login_fail_count?: number;
    last_cnn_dt?: string;
    login_ts?: number; // 세션 로그인 timestamp
}

export interface LoginResponse {
    success: boolean;
    user: User;
    token?: string; // Future use
}

export interface LoginHistory {
    uid: number;
    user_id: string;
    user_nm: string;
    login_dt: string;
    login_ip: string;
    login_success: 'SUCCESS' | 'FAIL';
    login_msg: string;
}

export interface SessionUser {
    login_ts: number;
    role: string;
    uid: number;
    user_id: string;
    user_nm: string;
    user_email?: string;
}