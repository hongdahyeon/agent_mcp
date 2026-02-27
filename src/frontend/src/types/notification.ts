
export interface Notification {
  id: number;
  receive_user_uid: number;
  receive_user_id?: string;
  receive_user_nm?: string;
  title: string;
  message: string;
  reg_dt: string;
  is_read: 'Y' | 'N';
  read_dt?: string;
  delete_at?: string;
  send_user_uid?: number;
  send_user_id?: string;
  send_user_nm?: string;
}

export interface NotificationState {
  unreadCount: number;
  notifications: Notification[];
  loading: boolean;
}
