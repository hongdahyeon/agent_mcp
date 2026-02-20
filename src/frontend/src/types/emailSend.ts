

export interface EmailLog {
    id: number;
    user_uid: number | null;
    user_id: string;
    user_nm: string;
    recipient: string;
    subject: string;
    content: string;
    is_scheduled: number;
    scheduled_dt: string | null;
    reg_dt: string;
    sent_dt: string | null;
    status: string;
    error_msg: string | null;
}