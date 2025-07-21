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

    for (const htmlfile of files) {
        const rel = path.relative('public/html', htmlfile);
        const pdffile = path.join('public/pdf', rel.replace(/\.html$/, '.pdf'));
        fs.mkdirSync(path.dirname(pdffile), { recursive: true });
        const page = await browser.newPage();
        await page.goto('file://' + path.resolve(htmlfile), { waitUntil: 'networkidle0' });

        // 计算更精确的页面宽度
        const maxWidth = await page.evaluate(() => {
            const elements = document.querySelectorAll('body *');
            let max = document.body.scrollWidth;
            elements.forEach(el => {
                const rect = el.getBoundingClientRect();
                const right = rect.right + window.pageXOffset;
                if (right > max) {
                    max = right;
                }
            });
            return max;
        });

        // 定义最大宽度、最小缩放比例
        const maxAllowedWidth = 3000;
        const minScale = 0.3;
        let scale = 1;
        let width = maxWidth;

        if (maxWidth > maxAllowedWidth) {
            scale = maxAllowedWidth / maxWidth;
            // 确保缩放比例不低于最小缩放比例
            if (scale < minScale) {
                scale = minScale;
                width = maxWidth / scale;
            } else {
                width = maxAllowedWidth;
            }
        }

        await page.pdf({
            path: pdffile,
            width: `${width}px`,
            scale: scale,
            printBackground: true
        });

        await page.close();
        console.log(`Converted ${htmlfile} -> ${pdffile}`);
    }

    await browser.close();
})();