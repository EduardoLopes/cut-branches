import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.join(__dirname, '../package.json');
const tauriConfigPath = path.join(__dirname, '../src-tauri/tauri.conf.json');
const cargoTomlPath = path.join(__dirname, '../src-tauri/Cargo.toml');
const cargoLockPath = path.join(__dirname, '../src-tauri/Cargo.lock');

const { version } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// tauri.conf.json — the version Tauri stamps onto the bundles and the one
// `tauri-action` substitutes into __VERSION__ for the tag and release name.
const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));
tauriConfig.version = version;
fs.writeFileSync(tauriConfigPath, `${JSON.stringify(tauriConfig, null, 2)}\n`, 'utf8');

// Cargo.toml — only the `[package]` version, never a dependency's. Anchored on
// the first `version = ` after `[package]` so the rest of the manifest is left
// untouched.
const cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
const cargoTomlUpdated = cargoToml.replace(
	/(\[package\][\s\S]*?\nversion\s*=\s*")[^"]*(")/,
	`$1${version}$2`
);
if (cargoTomlUpdated === cargoToml && !cargoToml.includes(`version = "${version}"`)) {
	throw new Error('Could not update the [package] version in src-tauri/Cargo.toml');
}
fs.writeFileSync(cargoTomlPath, cargoTomlUpdated, 'utf8');

// Cargo.lock — the `app` package entry must match Cargo.toml or a `--locked`
// build fails. Matches only the block whose name is exactly "app".
const cargoLock = fs.readFileSync(cargoLockPath, 'utf8');
const cargoLockUpdated = cargoLock.replace(
	/(\nname = "app"\nversion = ")[^"]*(")/,
	`$1${version}$2`
);
if (cargoLockUpdated === cargoLock && !cargoLock.includes(`name = "app"\nversion = "${version}"`)) {
	throw new Error('Could not update the app package version in src-tauri/Cargo.lock');
}
fs.writeFileSync(cargoLockPath, cargoLockUpdated, 'utf8');

console.log(`Synced tauri.conf.json, Cargo.toml and Cargo.lock to version ${version}`);
