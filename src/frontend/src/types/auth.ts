/* 
*  사용자 정보/로그인 관련 데이터 타입 정의
*/
export interface User {
    uid?: number;
    user_id: string;
    user_nm: string;
    role: string;
    is_enable?: string;
    last_cnn_dt?: string;
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
