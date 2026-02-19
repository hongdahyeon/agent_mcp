from fpdf import FPDF
import os
import json
import sys
import re

class OpenApiPDF(FPDF):
    
    def __init__(self):
        super().__init__()
        # Common Windows Malgun Gothic font paths
        paths = [
            "C:/Windows/Fonts/malgun.ttf",
            "C:/Windows/Fonts/Malgun.ttf",
            "/Windows/Fonts/malgun.ttf",
            "src/assets/fonts/malgun.ttf"
        ]
        bold_paths = [
            "C:/Windows/Fonts/malgunbd.ttf",
            "C:/Windows/Fonts/Malgunbd.ttf",
            "/Windows/Fonts/malgunbd.ttf",
            "src/assets/fonts/malgunbd.ttf"
        ]
        
        registered = False
        for p in paths:
            if os.path.exists(p):
                self.add_font("Malgun", "", p)
                registered = True
                break
        
        for p in bold_paths:
            if os.path.exists(p):
                self.add_font("Malgun", "B", p)
                break
        
        if registered:
            self.font_name = "Malgun"
        else:
            # Fallback to standard font
            self.font_name = "Helvetica"
            print("[PDF] Warning: Malgun Gothic not found. Falling back to Helvetica.", file=sys.stderr)

    # PDF 헤더 영역(제목) 생성
    def header(self):
        self.set_font(self.font_name, "B", 16)
        self.cell(0, 10, "OpenAPI Specification", ln=True, align="C")
        self.ln(5)

    # PDF 푸터 영역(페이지 번호) 생성
    def footer(self):
        self.set_y(-15)
        self.set_font(self.font_name, "", 8)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

# HTML 태그 제거 함수
def clean_html(text: str) -> str:
    if not text:
        return ""
    # HTML 태그 삭제
    clean = re.compile('<.*?>')
    text = re.sub(clean, '', text)
    # HTML 엔티티 디코딩
    return text

# OpenAPI PDF 생성 함수
def generate_openapi_pdf(
    api_data: dict,
    is_admin: bool = False
) -> bytes:
    pdf = OpenApiPDF()
    pdf.add_page()
    
    # [1] API 이름
    pdf.set_font(pdf.font_name, "B", 14)
    pdf.cell(0, 10, f"API Name: {api_data.get('name_ko', 'N/A')}", ln=True)
    pdf.set_font(pdf.font_name, "", 10)
    pdf.cell(0, 10, f"Tool ID: {api_data.get('tool_id', 'N/A')}", ln=True)
    pdf.cell(0, 10, f"Organization: {api_data.get('org_name', '-')}", ln=True)
    pdf.ln(5)

    # [2] Basic Information
    pdf.set_font(pdf.font_name, "B", 12)
    pdf.cell(0, 10, "Basic Information", ln=True)
    pdf.set_font(pdf.font_name, "", 10)
    
    # fpdf2의 table 기능을 사용하여 셀 높이 자동 조절
    with pdf.table(
        borders_layout="ALL",
        cell_fill_color=245,
        cell_fill_mode="ROWS",
        line_height=8,
        text_align="LEFT",
        width=190,
        col_widths=(40, 150)
    ) as table:
        row = table.row()
        row.cell("Method")
        row.cell(api_data.get('method', 'GET'))
        
        row = table.row()
        row.cell("Category")
        row.cell(api_data.get('category_name', '-'))

        row = table.row()
        row.cell("Tags")
        tags_list = api_data.get('tags', [])
        row.cell(", ".join(tags_list) if tags_list else "-")

        row = table.row()
        row.cell("API URL")
        row.cell(api_data.get('api_url', 'N/A'))
        
        row = table.row()
        row.cell("Auth Type")
        row.cell(api_data.get('auth_type', 'NONE'))
        
        if api_data.get('auth_param_nm'):
            row = table.row()
            row.cell("Auth Param")
            row.cell(api_data.get('auth_param_nm'))
        
        if is_admin and api_data.get('auth_key_val'):
            row = table.row()
            row.cell("Service Key")
            row.cell(api_data.get('auth_key_val'))
    
    pdf.ln(5)

    # [3] Parameters
    pdf.set_font(pdf.font_name, "B", 12)
    pdf.cell(0, 10, "Parameters (JSON Schema)", ln=True)
    pdf.set_font(pdf.font_name, "", 9)
    params = api_data.get('params_schema', '{}')
    try:
        if params:
            parsed_params = json.loads(params)
            pdf.multi_cell(0, 5, json.dumps(parsed_params, indent=4, ensure_ascii=False), border=1)
        else:
            pdf.cell(0, 10, "No parameters defined.", ln=True)
    except:
        pdf.multi_cell(0, 5, params, border=1)
    
    pdf.ln(5)

    # [4] Description
    if api_data.get('description_info'):
        pdf.set_font(pdf.font_name, "B", 12)
        pdf.cell(0, 10, "User Guide & Description", ln=True)
        pdf.set_font(pdf.font_name, "", 10)
        cleaned_description = clean_html(api_data.get('description_info'))
        pdf.multi_cell(0, 6, cleaned_description)
    
    pdf.ln(10)
    pdf.set_font(pdf.font_name, "", 8)
    pdf.cell(0, 10, f"Generated at: {api_data.get('reg_dt', 'N/A')}", ln=True, align="R")

    return bytes(pdf.output())