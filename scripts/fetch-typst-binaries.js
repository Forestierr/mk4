#!/usr/bin/env node
/**
 * fetch-typst-binaries.js
 *
 * Télécharge le binaire Typst pour la plateforme cible et le place dans dist/.
 * Exécuté automatiquement par "npm run vscode:prepublish" après le build esbuild.
 *
 * Usage :
 *   node scripts/fetch-typst-binaries.js [platform]
 *
 * Platform peut aussi être défini via la variable d'env VSCE_TARGET.
 * Si aucun n'est fourni, la plateforme courante est auto-détectée.
 *
 * Plateformes supportées :
 *   win32-x64 | win32-arm64 | linux-x64 | linux-arm64 | darwin-x64 | darwin-arm64
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// ─── Configuration ────────────────────────────────────────────────────────────

const TYPST_VERSION = 'v0.15.1';
const BASE_URL = `https://github.com/typst/typst/releases/download/${TYPST_VERSION}`;

/** Correspondance vsce-target → archive GitHub Releases */
const PLATFORM_MAP = {
    'win32-x64':    { archive: 'typst-x86_64-pc-windows-msvc.zip',        binary: 'typst.exe', ext: '.zip'    },
    'win32-arm64':  { archive: 'typst-aarch64-pc-windows-msvc.zip',       binary: 'typst.exe', ext: '.zip'    },
    'linux-x64':    { archive: 'typst-x86_64-unknown-linux-musl.tar.xz',  binary: 'typst',     ext: '.tar.xz' },
    'linux-arm64':  { archive: 'typst-aarch64-unknown-linux-musl.tar.xz', binary: 'typst',     ext: '.tar.xz' },
    'darwin-x64':   { archive: 'typst-x86_64-apple-darwin.tar.xz',        binary: 'typst',     ext: '.tar.xz' },
    'darwin-arm64': { archive: 'typst-aarch64-apple-darwin.tar.xz',       binary: 'typst',     ext: '.tar.xz' },
};

// ─── Détection de la plateforme ───────────────────────────────────────────────

function detectPlatform() {
    // 1. Argument CLI
    const arg = process.argv[2];
    if (arg && PLATFORM_MAP[arg]) return arg;

    // 2. Variable d'environnement (définie par le workflow CI)
    const envTarget = process.env.VSCE_TARGET;
    if (envTarget && PLATFORM_MAP[envTarget]) return envTarget;

    // 3. Auto-détection
    const p = process.platform;
    const a = process.arch;
    const key = `${p === 'win32' ? 'win32' : p === 'darwin' ? 'darwin' : 'linux'}-${a === 'arm64' ? 'arm64' : 'x64'}`;
    if (PLATFORM_MAP[key]) return key;

    throw new Error(`Plateforme non supportée : ${p}-${a}. Plateformes supportées : ${Object.keys(PLATFORM_MAP).join(', ')}`);
}

// ─── Téléchargement avec suivi de redirections ────────────────────────────────

function download(url, destPath) {
    return new Promise((resolve, reject) => {
        function get(url, redirects = 0) {
            if (redirects > 10) { reject(new Error('Trop de redirections HTTP')); return; }
            https.get(url, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    res.resume();
                    get(res.headers.location, redirects + 1);
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode} pour ${url}`));
                    return;
                }
                const file = fs.createWriteStream(destPath);
                res.pipe(file);
                file.on('finish', () => file.close(resolve));
                file.on('error', reject);
            }).on('error', reject);
        }
        get(url);
    });
}

// ─── Recherche récursive du binaire dans un répertoire ────────────────────────

function findFile(dir, name) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const found = findFile(full, name);
            if (found) return found;
        } else if (entry.name === name) {
            return full;
        }
    }
    return null;
}

// ─── Extraction de l'archive ──────────────────────────────────────────────────

function extract(archivePath, ext, binaryName, destDir) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'typst-extract-'));
    try {
        if (ext === '.zip') {
            if (process.platform === 'win32') {
                execSync(`powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${tmpDir}' -Force"`, { stdio: 'pipe' });
            } else {
                execSync(`unzip -q "${archivePath}" -d "${tmpDir}"`, { stdio: 'pipe' });
            }
        } else {
            // .tar.xz
            execSync(`tar -xJf "${archivePath}" -C "${tmpDir}"`, { stdio: 'pipe' });
        }

        const found = findFile(tmpDir, binaryName);
        if (!found) {
            throw new Error(`Binaire "${binaryName}" introuvable dans l'archive.`);
        }

        const destPath = path.join(destDir, binaryName);
        fs.copyFileSync(found, destPath);

        // Rendre exécutable sur Unix
        if (!binaryName.endsWith('.exe')) {
            fs.chmodSync(destPath, 0o755);
        }

        return destPath;
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────

async function main() {
    const platform = detectPlatform();
    const { archive, binary, ext } = PLATFORM_MAP[platform];
    const url = `${BASE_URL}/${archive}`;

    const distDir = path.resolve(__dirname, '..', 'dist');
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }

    // Éviter un re-téléchargement si le binaire est déjà présent et à jour
    const destBinary = path.join(distDir, binary);
    if (fs.existsSync(destBinary)) {
        console.log(`✓ Binaire Typst déjà présent : ${destBinary}`);
        return;
    }

    const tmpArchive = path.join(os.tmpdir(), archive);

    console.log(`⬇  Téléchargement de Typst ${TYPST_VERSION} pour ${platform}...`);
    console.log(`   URL : ${url}`);
    await download(url, tmpArchive);
    console.log(`   Archive sauvegardée : ${tmpArchive}`);

    console.log(`📦 Extraction du binaire "${binary}"...`);
    const finalPath = extract(tmpArchive, ext, binary, distDir);
    console.log(`✓ Binaire extrait : ${finalPath}`);

    // Nettoyage de l'archive temporaire
    try { fs.unlinkSync(tmpArchive); } catch { /* ignore */ }
}

main().catch(err => {
    console.error('❌ Erreur lors du téléchargement de Typst :', err.message);
    process.exit(1);
});
