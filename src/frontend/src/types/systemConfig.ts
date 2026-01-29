export interface SystemConfig {
    name: string;
    configuration: string;
    description: string;
    reg_dt: string;
}

export interface ConfigFormData {
    name: string;
    configuration: string;
    description: string;
}

export interface Props {
    token: string | null;
}