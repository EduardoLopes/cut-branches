import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.join(__dirname, '../package.json');
const tauriConfigPath = path.join(__dirname, '../src-tauri/tauri.conf.json');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));

tauriConfig.version = packageJson.version;

fs.writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, 2), 'utf8');

console.log(`Updated tauri.conf.json to version ${packageJson.version}`);
