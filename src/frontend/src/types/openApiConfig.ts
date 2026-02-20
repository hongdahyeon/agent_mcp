export interface OpenApiConfig {
    id?: number;
    tool_id: string;
    name_ko: string;
    org_name: string;
    method: string;
    api_url: string;
    auth_type: string;
    auth_param_nm: string;
    auth_key_val: string;
    params_schema: string;
    description_agent: string;
    description_info: string;
    batch_id: string;
    category_id?: number;
    category_name?: string;
    tags?: string[];
    reg_dt?: string;
}

export interface UploadedFile {
    file_uid: number;
    file_id: string;
    org_file_nm: string;
    file_url: string;
    file_size: number;
    batch_id: string;
    reg_dt: string;
}