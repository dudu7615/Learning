import os
import asyncio
from pyppeteer import launch
from pathlib import Path

async def convert_html_to_pdf(html_path, pdf_path):
    """将单个HTML文件转换为PDF"""
    browser = await launch(headless=True)
    page = await browser.newPage()
    
    # 读取HTML文件内容
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # 设置视口为A4尺寸
    await page.setViewport({'width': 595, 'height': 842})
    
    # 加载HTML内容
    await page.goto(f'file://{os.path.abspath(html_path)}', waitUntil='networkidle0')
    
    # 计算内容的宽度和高度
    content_width = await page.evaluate('document.body.scrollWidth')
    content_height = await page.evaluate('document.body.scrollHeight')
    
    # 确定使用横向还是纵向
    is_landscape = content_width > content_height
    
    # 计算缩放比例
    width_scale = 595 / content_width
    height_scale = 842 / content_height
    scale = min(width_scale, height_scale)
    
    # 确保缩放比例不会过大
    scale = min(scale, 1.0)
    
    # 创建PDF保存目录
    os.makedirs(os.path.dirname(pdf_path), exist_ok=True)
    
    # 保存为PDF
    await page.pdf({
        'path': pdf_path,
        'format': 'A4',
        'landscape': is_landscape,
        'scale': scale,
        'printBackground': True
    })
    
    await browser.close()
    print(f"已转换: {html_path} -> {pdf_path}")

async def main():
    """主函数：处理所有HTML文件"""
    html_dir = Path('public/html')
    pdf_dir = Path('public/pdf')
    
    # 确保输出目录存在
    pdf_dir.mkdir(parents=True, exist_ok=True)
    
    # 获取所有HTML文件
    html_files = list(html_dir.rglob('*.html'))
    
    if not html_files:
        print("未找到HTML文件")
        return
    
    # 处理每个HTML文件
    for html_file in html_files:
        # 计算对应的PDF路径，保持目录结构
        relative_path = html_file.relative_to(html_dir)
        pdf_file = pdf_dir / relative_path.with_suffix('.pdf')
        
        # 确保父目录存在
        pdf_file.parent.mkdir(parents=True, exist_ok=True)
        
        # 转换HTML到PDF
        await convert_html_to_pdf(str(html_file), str(pdf_file))

if __name__ == "__main__":
    # 运行异步主函数
    asyncio.run(main())    