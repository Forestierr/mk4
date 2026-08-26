import * as vscode from 'vscode';

/**
 * Barre d'état MK4 — affiche l'état de compilation et le thème actif.
 *
 * - Icône + thème actif cliquable → ouvre le sélecteur rapide de thème.
 * - État de compilation mis à jour via `setCompiling()` / `setIdle()` / `setError()`.
 */
export class MK4StatusBar {
    private readonly item: vscode.StatusBarItem;
    private currentTheme: string = '';
    private isCompiling: boolean = false;

    constructor() {
        this.item = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.item.command = 'mk4.selectTheme';
        this.item.tooltip = 'MK4 · Cliquez pour changer de thème';
        this.refresh();
    }

    /** Active la barre d'état pour les fichiers Markdown. */
    show(document: vscode.TextDocument): void {
        if (document.languageId === 'markdown') {
            this.currentTheme = this.resolveActiveTheme(document);
            this.refresh();
            this.item.show();
        } else {
            this.item.hide();
        }
    }

    hide(): void {
        this.item.hide();
    }

    /** Indique qu'une compilation est en cours. */
    setCompiling(): void {
        this.isCompiling = true;
        this.refresh();
    }

    /** Compilation réussie. */
    setIdle(document?: vscode.TextDocument): void {
        this.isCompiling = false;
        if (document) {
            this.currentTheme = this.resolveActiveTheme(document);
        }
        this.refresh();
    }

    /** Erreur de compilation. */
    setError(): void {
        this.isCompiling = false;
        this.item.text       = '$(error) MK4 — Erreur';
        this.item.color      = new vscode.ThemeColor('errorForeground');
        this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }

    dispose(): void {
        this.item.dispose();
    }

    // ── Privé ─────────────────────────────────────────────────────────────

    private refresh(): void {
        this.item.color           = undefined;
        this.item.backgroundColor = undefined;

        if (this.isCompiling) {
            this.item.text = '$(loading~spin) MK4 — Compilation…';
        } else {
            const theme = this.currentTheme || 'default';
            this.item.text = `$(file-code) MK4 — ${theme}`;
        }
    }

    /**
     * Détermine le thème actif selon l'ordre de priorité MK4 :
     * 1. Annotation `:theme` dans le document.
     * 2. Paramètre `mk4.typst.customThemePath`.
     * 3. Paramètre `mk4.typst.defaultTheme`.
     */
    private resolveActiveTheme(document: vscode.TextDocument): string {
        const text = document.getText();
        const docThemeMatch = text.match(/^\s*:theme\s+(.+)$/m);
        if (docThemeMatch) {
            // Retourner uniquement le nom de fichier pour la lisibilité
            const parts = docThemeMatch[1].trim().split(/[/\\]/);
            return parts[parts.length - 1];
        }

        const config = vscode.workspace.getConfiguration('mk4.typst');
        const customPath = config.get<string>('customThemePath', '');
        if (customPath) {
            const parts = customPath.split(/[/\\]/);
            return parts[parts.length - 1];
        }

        return config.get<string>('defaultTheme', 'default');
    }
}

/**
 * Enregistre la commande `mk4.selectTheme` (sélecteur rapide de thème).
 */
export function registerThemePickerCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('mk4.selectTheme', async () => {
        const config   = vscode.workspace.getConfiguration('mk4.typst');
        const current  = config.get<string>('defaultTheme', 'default');

        const choices: vscode.QuickPickItem[] = [
            {
                label: '$(paintcan) default',
                description: 'Standard & Minimaliste',
                detail: current === 'default' ? '✓ Thème actif' : undefined
            },
            {
                label: '$(briefcase) modern',
                description: 'Rapports d\'entreprise & Documentation',
                detail: current === 'modern' ? '✓ Thème actif' : undefined
            },
            {
                label: '$(book) academic',
                description: 'Articles scientifiques & Thèses',
                detail: current === 'academic' ? '✓ Thème actif' : undefined
            },
            {
                label: '$(folder-opened) Thème personnalisé…',
                description: 'Sélectionner un fichier .typ',
            },
        ];

        const picked = await vscode.window.showQuickPick(choices, {
            title:       'MK4 — Sélectionner un thème',
            placeHolder: 'Choisissez un thème intégré ou un fichier .typ personnalisé',
            matchOnDescription: true,
        });

        if (!picked) { return; }

        if (picked.label.includes('Thème personnalisé')) {
            const uris = await vscode.window.showOpenDialog({
                canSelectFiles:      true,
                canSelectFolders:    false,
                canSelectMany:       false,
                filters:             { 'Typst': ['typ'] },
                title:               'Sélectionner un thème Typst personnalisé',
            });
            if (uris && uris[0]) {
                await config.update('customThemePath', uris[0].fsPath, vscode.ConfigurationTarget.Workspace);
                vscode.window.showInformationMessage(`MK4 : Thème personnalisé appliqué : ${uris[0].fsPath}`);
            }
            return;
        }

        // Extraire le nom du thème depuis le label (supprime l'icône)
        const themeName = picked.label.split(' ')[1] as 'default' | 'modern' | 'academic';
        await config.update('defaultTheme', themeName, vscode.ConfigurationTarget.Workspace);
        // Effacer l'éventuel thème personnalisé précédent
        await config.update('customThemePath', '', vscode.ConfigurationTarget.Workspace);
        vscode.window.showInformationMessage(`MK4 : Thème « ${themeName} » activé.`);
    });
}
