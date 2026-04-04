const fs = require('fs');
const path = require('path');

function removeBom(filePath) {
    const buffer = fs.readFileSync(filePath);
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        console.log(`Removing BOM from: ${filePath}`);
        const content = buffer.slice(3);
        fs.writeFileSync(filePath, content);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            const base = path.basename(fullPath);
            if (!['node_modules', '.git', 'dist', 'build', '.gemini', 'tmp'].includes(base)) {
                walk(fullPath);
            }
        } else {
            const ext = path.extname(file);
            if (['.gradle', '.java', '.xml', '.ts', '.tsx', '.js', '.json'].includes(ext)) {
                removeBom(fullPath);
            }
        }
    }
}

const root = process.argv[2] || '.';
walk(root);
