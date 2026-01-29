import type { User } from "./auth";

export interface Props {
    user: User;
}

export interface EmailLog {
    id: number;
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