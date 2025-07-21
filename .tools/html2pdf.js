const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const files = process.argv[2] ? [process.argv[2]] : [];

    if (!files.length) {
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

        // 定义最大宽度、最小缩放比例、目标宽度
        const maxAllowedWidth = 3000;
        const minScale = 0.6;
        const targetWidth = 1200;
        let scale = 1;
        let width = maxWidth;

        if (maxWidth > maxAllowedWidth) {
            scale = maxAllowedWidth / maxWidth;
            if (scale < minScale) {
                scale = minScale;
                width = maxWidth / scale;
            } else {
                width = maxAllowedWidth;
            }
        }

        // 如果宽度仍然过大，进一步调整缩放比例以接近目标宽度
        if (width > targetWidth) {
            scale = scale * (targetWidth / width);
            width = targetWidth;
        }

        // 临时调整页面的缩放样式
        await page.evaluate((s) => {
            document.body.style.transform = `scale(${s})`;
            document.body.style.transformOrigin = 'top left';
        }, scale);

        await page.pdf({
            path: pdffile,
            width: `${width}px`,
            scale: 1, // 由于已经在页面内调整了缩放，这里 scale 设为 1
            printBackground: true
        });

        await page.close();
        console.log(`Converted ${htmlfile} -> ${pdffile}`);
    }

    await browser.close();
})();