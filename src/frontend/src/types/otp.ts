export interface OtpLog {
    id: number;
    email: string;
    otp_type: string;
    otp_code: string;
    expires_at: string;
    is_verified: 'Y' | 'N';
    reg_dt: string;
}

export interface OtpHistoryResponse {
    items: OtpLog[];
    total: number;
    page: number;
    size: number;
}
