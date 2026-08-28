/**
 * Génère le HTML initial de la webview Typst (chargé une seule fois).
 * Les mises à jour suivantes se font via postMessage { type: 'update' }.
 */
export function getSvgHtml(): string {
    return `<!DOCTYPE html>
    <html lang="fr">
    <head>
        <style>
            body {
                background-color: var(--vscode-editor-background);
                margin: 0; padding: 40px 20px;
            }
            #pages-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 40px;
            }
            .page {
                background: white;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                max-width: 100%;
                height: auto;
            }
            svg {
                display: block;
                width: 100%;
                height: auto;
            }
            #loading {
                color: var(--vscode-descriptionForeground);
                font-family: var(--vscode-font-family, sans-serif);
                font-size: 14px;
                opacity: 0.7;
                padding: 60px 0;
            }
        </style>
    </head>
    <body>
        <div id="error-banner" style="display: none; position: fixed; top: 10px; right: 10px; background: #e74c3c; color: white; padding: 10px 15px; border-radius: 5px; z-index: 1000; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-family: sans-serif; max-width: 300px; font-size: 12px;">
            <strong>Erreur Typst</strong><br>
            <span id="error-text"></span>
        </div>

        <div id="pages-container">
            <div id="loading">Compilation en cours…</div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            const errorBanner = document.getElementById('error-banner');
            const errorText   = document.getElementById('error-text');
            const container   = document.getElementById('pages-container');

            let currentMap = [];
            let absYCache  = [];
            let isScrollingFromEditor = false;
            let editorScrollTimer     = null;

            // ======================================================
            // Mise à jour incrémentale des pages (pas de rechargement)
            // ======================================================
            function applyUpdate(pages, rawMap) {
                // 1. Mettre à jour uniquement les pages qui ont changé
                const existingDivs = Array.from(container.querySelectorAll('.page'));
                const newCount = pages.length;
                const oldCount = existingDivs.length;

                // Mettre à jour / créer les pages
                for (let i = 0; i < newCount; i++) {
                    if (i < oldCount) {
                        // Mise à jour si le contenu a changé
                        if (existingDivs[i].innerHTML !== pages[i]) {
                            existingDivs[i].innerHTML = pages[i];
                        }
                    } else {
                        // Nouvelle page
                        const div = document.createElement('div');
                        div.className = 'page';
                        div.innerHTML = pages[i];
                        container.appendChild(div);
                    }
                }

                // Supprimer les pages en trop (ex: on a retiré un pagebreak)
                for (let i = newCount; i < oldCount; i++) {
                    existingDivs[i].remove();
                }

                // Supprimer le message de chargement initial si présent
                const loading = document.getElementById('loading');
                if (loading) loading.remove();

                // 2. Reconstruire la map de positions pour le scroll sync
                try {
                    currentMap = rawMap.map(item => ({
                        line: parseInt(item.value),
                        page: item.pos.page,
                        y: parseFloat(String(item.pos.y).replace('pt', ''))
                    })).sort((a, b) => a.line - b.line);
                } catch (e) {
                    console.error('Map parsing error', e);
                    currentMap = [];
                }

                // 3. Reconstruire le cache Y (après que le DOM est prêt)
                requestAnimationFrame(rebuildAbsYCache);
            }

            // ======================================================
            // Réception des messages de l'extension
            // ======================================================
            window.addEventListener('message', event => {
                const message = event.data;

                if (message.type === 'update') {
                    applyUpdate(message.pages, message.map);
                    errorBanner.style.display = 'none';
                } else if (message.type === 'showError') {
                    errorText.textContent = message.text;
                    errorBanner.style.display = 'block';
                } else if (message.type === 'clearError') {
                    errorBanner.style.display = 'none';
                } else if (message.command === 'syncScroll') {
                    handleEditorScroll(message.line);
                }
            });

            // ======================================================
            // Scroll sync : éditeur → preview
            // ======================================================
            function getAbsoluteY(anchor) {
                const pages = container.querySelectorAll('.page');
                const pageDiv = pages[anchor.page - 1];
                if (!pageDiv) return 0;
                const svg = pageDiv.querySelector('svg');
                if (!svg) return 0;
                const svgNativeHeight = parseFloat(svg.getAttribute('height')) || 1;
                const svgDomHeight = svg.getBoundingClientRect().height;
                return pageDiv.offsetTop + (anchor.y * svgDomHeight / svgNativeHeight);
            }

            function rebuildAbsYCache() {
                absYCache = currentMap.map(a => getAbsoluteY(a));
            }
            window.addEventListener('resize', rebuildAbsYCache);

            function interpolate(map, cache, key, getValue) {
                let prevIdx = -1;
                for (let i = 0; i < map.length; i++) {
                    if (getValue(map[i]) <= key) { prevIdx = i; } else { break; }
                }
                const prev = prevIdx >= 0 ? map[prevIdx] : null;
                const next = (prevIdx + 1 < map.length) ? map[prevIdx + 1] : null;
                const prevVal = prev ? cache[prevIdx] : null;
                const nextVal = next ? cache[prevIdx + 1] : null;

                if (prev && next && getValue(next) > getValue(prev)) {
                    const ratio = (key - getValue(prev)) / (getValue(next) - getValue(prev));
                    return prevVal + ratio * (nextVal - prevVal);
                } else if (prev) { return prevVal; }
                else if (next)   { return nextVal; }
                return null;
            }

            function handleEditorScroll(targetLine) {
                if (currentMap.length === 0) return;
                isScrollingFromEditor = true;
                if (editorScrollTimer) clearTimeout(editorScrollTimer);
                editorScrollTimer = setTimeout(() => { isScrollingFromEditor = false; }, 300);

                const targetY = interpolate(currentMap, absYCache, targetLine, m => m.line);
                if (targetY === null) return;
                const topOffset = window.innerHeight * 0.33;
                window.scrollTo({ top: Math.max(0, targetY - topOffset), behavior: 'smooth' });
            }

            // ======================================================
            // Scroll sync : preview → éditeur
            // ======================================================
            let scrollScheduled = false;
            window.addEventListener('scroll', () => {
                if (isScrollingFromEditor || currentMap.length === 0) return;
                if (scrollScheduled) return;
                scrollScheduled = true;

                requestAnimationFrame(() => {
                    scrollScheduled = false;
                    if (absYCache.length === 0) rebuildAbsYCache();

                    const currentY = window.scrollY + window.innerHeight * 0.33;
                    const targetLine = interpolate(absYCache.map((v, i) => ({ y: v, line: currentMap[i].line })),
                                                   absYCache.map((_, i) => currentMap[i].line),
                                                   currentY, m => m.y);

                    // Recalcul simplifié via index
                    let prevIdx = -1;
                    for (let i = 0; i < absYCache.length; i++) {
                        if (absYCache[i] <= currentY) { prevIdx = i; } else { break; }
                    }
                    const prev = prevIdx >= 0 ? currentMap[prevIdx] : null;
                    const next = (prevIdx + 1 < currentMap.length) ? currentMap[prevIdx + 1] : null;
                    const prevY = prevIdx >= 0 ? absYCache[prevIdx] : null;
                    const nextY = (prevIdx + 1 < absYCache.length) ? absYCache[prevIdx + 1] : null;

                    let line;
                    if (prev && next && nextY > prevY) {
                        const ratio = (currentY - prevY) / (nextY - prevY);
                        line = prev.line + ratio * (next.line - prev.line);
                    } else if (prev) { line = prev.line; }
                    else if (next)   { line = next.line; }
                    else             { return; }

                    vscode.postMessage({ command: 'revealLine', line: Math.round(line) });
                });
            });

            // ======================================================
            // Clic : Preview → Ouvrir le fichier source à la ligne
            // ======================================================
            container.addEventListener('click', (event) => {
                // Ne pas intercepter les clics sur les liens hypertextes
                if (event.target && (event.target.tagName === 'A' || event.target.closest('a'))) {
                    return;
                }

                if (currentMap.length === 0) return;
                if (absYCache.length === 0) rebuildAbsYCache();

                const clickY = event.pageY;

                let prevIdx = -1;
                for (let i = 0; i < absYCache.length; i++) {
                    if (absYCache[i] <= clickY) { prevIdx = i; } else { break; }
                }
                const prev = prevIdx >= 0 ? currentMap[prevIdx] : null;
                const next = (prevIdx + 1 < currentMap.length) ? currentMap[prevIdx + 1] : null;
                const prevY = prevIdx >= 0 ? absYCache[prevIdx] : null;
                const nextY = (prevIdx + 1 < absYCache.length) ? absYCache[prevIdx + 1] : null;

                let line;
                if (prev && next && nextY > prevY) {
                    const ratio = (clickY - prevY) / (nextY - prevY);
                    line = prev.line + ratio * (next.line - prev.line);
                } else if (prev) {
                    line = prev.line;
                } else if (next) {
                    line = next.line;
                } else {
                    return;
                }

                vscode.postMessage({ command: 'openSource', line: Math.round(line) });
            });
        </script>
    </body>
    </html>`;
}
