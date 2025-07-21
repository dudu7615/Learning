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
        
        await page.waitForTimeout(2000); 
        // 获取 HTML 页面的实际宽度
        const bodyWidth = await page.evaluate(() => {
            return document.body.scrollWidth;
        });

        // 定义最大宽度和默认缩放比例
        const maxWidth = 2000;
        let scale = 1;
        let width = bodyWidth;

        // 如果页面宽度超过最大宽度，调整缩放比例和宽度
        if (bodyWidth > maxWidth) {
            scale = maxWidth / bodyWidth;
            width = maxWidth;
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