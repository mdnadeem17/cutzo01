const fs = require('fs');
const path = require('path');

const allowedExts = ['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.md', '.java', '.xml', '.gradle', '.webmanifest'];
const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.gemini', 'android/app/build'];

let log = '';
function logMsg(msg) {
    console.log(msg);
    log += msg + '\n';
}

function processFile(filePath) {
    if (!allowedExts.includes(path.extname(filePath))) return;
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content
            .replace(/trimo/g, 'cutzo')
            .replace(/Trimo/g, 'Cutzo')
            .replace(/TRIMO/g, 'CUTZO');
            
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            logMsg('Modified string in: ' + filePath);
        }
    } catch(e) {
        logMsg('Error reading/writing ' + filePath + ': ' + e);
    }
}

function processDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    try {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
            if (ignoreDirs.includes(file)) continue;
            
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                if (ignoreDirs.some(ignored => fullPath.includes(ignored))) continue;
                processDirectory(fullPath);
            } else {
                processFile(fullPath);
            }
        }
    } catch(e) {
         logMsg('Error processing dir ' + dir + ': ' + e);
    }
}

try {
    const root = __dirname;
    processDirectory(path.join(root, 'src'));
    processDirectory(path.join(root, 'convex'));
    processDirectory(path.join(root, 'public'));
    processDirectory(path.join(root, 'android/app/src/main'));

    const rootFiles = ['index.html', 'package.json', 'README.md', 'capacitor.config.ts', 'android/app/build.gradle'];
    for (const rf of rootFiles) {
        const fullPath = path.join(root, rf);
        if (fs.existsSync(fullPath)) {
            processFile(fullPath);
        }
    }

    const renames = [
        ['src/components/vendor/TrimoHeader.tsx', 'src/components/vendor/CutzoHeader.tsx'],
        ['src/components/trimo', 'src/components/cutzo'],
        ['android/app/src/main/java/com/trimo', 'android/app/src/main/java/com/cutzo']
    ];

    for (const [oldP, newP] of renames) {
        const oldFull = path.join(root, oldP);
        const newFull = path.join(root, newP);
        if (fs.existsSync(oldFull)) {
            try {
                fs.renameSync(oldFull, newFull);
                logMsg(`Renamed ${oldP} to ${newP}`);
            } catch (e) {
                logMsg(`Failed to rename ${oldP}: ` + e);
            }
        }
    }
} catch(err) {
    logMsg('Fatal error: ' + err);
}

fs.writeFileSync(path.join(__dirname, 'node_run_log.txt'), log, 'utf8');
