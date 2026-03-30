const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const standaloneDir = path.join(rootDir, '.next', 'standalone');
const standaloneStaticDir = path.join(standaloneDir, '.next', 'static');
const sourceStaticDir = path.join(rootDir, '.next', 'static');
const sourcePublicDir = path.join(rootDir, 'public');
const standalonePublicDir = path.join(standaloneDir, 'public');
const standaloneServer = path.join(standaloneDir, 'server.js');

function copyDirectoryIfPresent(sourceDir, destinationDir) {
  if (!fs.existsSync(sourceDir)) {
    return;
  }

  fs.mkdirSync(path.dirname(destinationDir), { recursive: true });
  fs.cpSync(sourceDir, destinationDir, { recursive: true, force: true });
}

if (!fs.existsSync(standaloneServer)) {
  console.error('Standalone build not found. Run `npm run build` before `npm start`.');
  process.exit(1);
}

copyDirectoryIfPresent(sourceStaticDir, standaloneStaticDir);
copyDirectoryIfPresent(sourcePublicDir, standalonePublicDir);

require(standaloneServer);
