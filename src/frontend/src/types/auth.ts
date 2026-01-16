export interface User {
    user_id: string;
    user_nm: string;
    role: string;
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
