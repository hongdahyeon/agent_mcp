
export interface ToolParam {
    id?: number;
    param_name: string;
    param_type: 'STRING' | 'NUMBER' | 'BOOLEAN';
    is_required: 'Y' | 'N';
    description: string;
}

export interface CustomTool {
    id: number;
    name: string;
    tool_type: 'SQL' | 'PYTHON';
    definition: string;
    description_user?: string;
    description_agent?: string;
    is_active: 'Y' | 'N';
    reg_dt: string;
    created_by: string;
}

export interface CustomToolDetail {
    tool: CustomTool;
    params: ToolParam[];
}

export interface CustomToolFormData {
    name: string;
    tool_type: 'SQL' | 'PYTHON';
    definition: string;
    description_user: string;
    description_agent: string;
    is_active: 'Y' | 'N';
    params: ToolParam[];
}
