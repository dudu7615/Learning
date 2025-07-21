import os
import shutil
from pathlib import Path
from weasyprint import HTML

def convert_html_to_pdf(html_dir, pdf_dir):
    # 遍历HTML目录及其子目录
    for root, dirs, files in os.walk(html_dir):
        for file in files:
            if file.endswith('.html'):
                html_path = os.path.join(root, file)
                relative_path = os.path.relpath(root, html_dir)
                pdf_subdir = os.path.join(pdf_dir, relative_path)
                
                # 创建对应的PDF子目录
                os.makedirs(pdf_subdir, exist_ok=True)
                
                # 构造PDF输出路径
                pdf_name = os.path.splitext(file)[0] + '.pdf'
                pdf_path = os.path.join(pdf_subdir, pdf_name)
                
                # 使用WeasyPrint生成PDF
                try:
                    html = HTML(html_path)
                    # 获取页面尺寸并动态调整方向和缩放
                    page_size = 'A4'
                    orientation = 'portrait'  # 默认纵向
                    zoom_factor = 1.0
                    
                    # 渲染HTML到PDF
                    html.write_pdf(
                        pdf_path,
                        stylesheets=[],
                        presentational_hints=True,
                        optimize_images=True,
                        zoom=zoom_factor,
                        dpi=300,
                        base_url=os.path.dirname(html_path),
                        margin_top='0mm',
                        margin_right='0mm',
                        margin_bottom='0mm',
                        margin_left='0mm',
                        format=page_size,
                        orientation=orientation
                    )
                    print(f"已转换: {html_path} -> {pdf_path}")
                except Exception as e:
                    print(f"转换失败: {html_path}, 错误: {e}")

if __name__ == "__main__":
    html_dir = "public/html"
    pdf_dir = "public/pdf"
    
    # 清空目标PDF目录（如果存在）
    if os.path.exists(pdf_dir):
        shutil.rmtree(pdf_dir)
    os.makedirs(pdf_dir, exist_ok=True)
    
    # 开始转换
    convert_html_to_pdf(html_dir, pdf_dir)