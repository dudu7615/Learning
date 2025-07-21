const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const files = process.argv[2] ? [process.argv[2]] : [];

    if (!files.length) {
        // 递归查找 public/html 目录下的所有 .html 文件
        function walk(dir) {
            let results = [];
            fs.readdirSync(dir).forEach(file => {
                const fullPath = path.join(dir, file);
                if (fs.statSync(fullPath).isDirectory()) {
                    results = results.concat(walk(fullPath));
                } else if (file.endsWith('.html')) {
                    results.push(fullPath);
                }
            });
            return results;
        }
        files.push(...walk('public/html'));
    }

    // A4 尺寸（像素，假设 96 DPI）
    const a4WidthPx = 842;
    const a4HeightPx = 595;

    for (const htmlfile of files) {
        const rel = path.relative('public/html', htmlfile);
        const pdffile = path.join('public/pdf', rel.replace(/\.html$/, '.pdf'));
        fs.mkdirSync(path.dirname(pdffile), { recursive: true });
        const page = await browser.newPage();
        await page.goto('file://' + path.resolve(htmlfile), { waitUntil: 'networkidle0' });

        // 计算页面内容的宽度和高度
        const pageSize = await page.evaluate(() => {
            const elements = document.querySelectorAll('body *');
            let maxWidth = document.body.scrollWidth;
            let maxHeight = document.body.scrollHeight;
            elements.forEach(el => {
                const rect = el.getBoundingClientRect();
                const right = rect.right + window.pageXOffset;
                const bottom = rect.bottom + window.pageYOffset;
                if (right > maxWidth) {
                    maxWidth = right;
                }
                if (bottom > maxHeight) {
                    maxHeight = bottom;
                }
            });
            return { width: maxWidth, height: maxHeight };
        });

        let landscape = false;
        let scale;

        // 动态确定使用横向或纵向
        if (pageSize.width > pageSize.height) {
            landscape = true;
            scale = Math.min(a4WidthPx / pageSize.width, a4HeightPx / pageSize.height);
        } else {
            scale = Math.min(a4HeightPx / pageSize.height, a4WidthPx / pageSize.width);
        }

        // 设定最大缩放比例，避免内容过大
        const maxScale = 2;
        if (scale > maxScale) {
            scale = maxScale;
        }

        await page.pdf({
            path: pdffile,
            format: 'A4',
            landscape: landscape,
            scale: scale,
            printBackground: true
        });

        await page.close();
        console.log(`Converted ${htmlfile} -> ${pdffile}`);
    }

    await browser.close();
})();