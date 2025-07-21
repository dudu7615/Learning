const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// 遍历指定目录及其子目录
function traverseDirectory(dir, callback) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverseDirectory(fullPath, callback);
        } else {
            callback(fullPath);
        }
    });
}

// 将HTML文件转换为PDF
async function convertHtmlToPdf(htmlFilePath) {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // 加载HTML文件
    await page.goto(`file://${htmlFilePath}`, { waitUntil: 'networkidle0' });

    // 获取页面尺寸
    const dimensions = await page.evaluate(() => ({
        width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
    }));

    // 确定方向和缩放比例
    const isLandscape = dimensions.width > dimensions.height;
    const scale = Math.min(1, 842 / dimensions.height, 595 / dimensions.width); // A4尺寸

    // 生成PDF
    const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: isLandscape,
        scale: scale,
        printBackground: true
    });

    await browser.close();

    // 构造PDF输出路径
    const relativePath = path.relative(path.join(__dirname, '../public/html'), htmlFilePath);
    const outputDir = path.join(__dirname, '../public/pdf', path.dirname(relativePath));
    const outputFile = path.join(outputDir, path.basename(htmlFilePath, '.html') + '.pdf');

    // 创建目标目录
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 写入PDF文件
    fs.writeFileSync(outputFile, pdfBuffer);
    console.log(`Generated PDF: ${outputFile}`);
}

// 主函数
(async () => {
    const htmlDir = path.join(__dirname, '../public/html');
    traverseDirectory(htmlDir, async htmlFilePath => {
        if (path.extname(htmlFilePath) === '.html') {
            await convertHtmlToPdf(htmlFilePath);
        }
    });
})();