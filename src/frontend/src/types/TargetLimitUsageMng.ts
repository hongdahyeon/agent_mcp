export interface Limit {
    id: number;
    target_type: 'USER' | 'ROLE';
    target_id: string;
    limit_type: string;
    max_count: number;
    description: string;
}

export interface LimitFormData {
    target_type: 'USER' | 'ROLE';
    target_id: string;
    max_count: number;
    description: string;
}