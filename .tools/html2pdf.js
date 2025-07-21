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

        const safeMaxWidth = 3000;
        let scale = 1;
        let width = maxWidth;

        if (maxWidth > safeMaxWidth) {
            scale = safeMaxWidth / maxWidth;
            width = safeMaxWidth;
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