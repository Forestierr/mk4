import * as vscode from 'vscode';

/**
 * CodeLens Provider MK4.
 *
 * Affiche des boutons interactifs discrets au-dessus du document Markdown
 * pour lancer en un clic l'aperçu Typst, l'export PDF ou changer de gabarit.
 *
 * Les lenses sont affichées uniquement sur la première ligne du document.
 */
export function createCodeLensProvider(): vscode.Disposable {
    const provider = new MK4CodeLensProvider();
    return vscode.languages.registerCodeLensProvider('markdown', provider);
}

class MK4CodeLensProvider implements vscode.CodeLensProvider {
    private readonly _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
    readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        // Respecter le paramètre utilisateur
        const enabled = vscode.workspace
            .getConfiguration('mk4.editor')
            .get<boolean>('enableCodeLens', true);
        if (!enabled) { return []; }

        // N'afficher que pour les fichiers sauvegardés
        if (document.isUntitled) { return []; }

        const topRange = new vscode.Range(0, 0, 0, 0);

        return [
            // Aperçu Typst en direct
            new vscode.CodeLens(topRange, {
                title:   '$(open-preview) Aperçu Typst',
                tooltip: 'Ouvrir l\'aperçu Typst en direct (MK4)',
                command: 'mk4.showPreview',
            }),

            // Export PDF
            new vscode.CodeLens(topRange, {
                title:   '$(file-pdf) Exporter en PDF',
                tooltip: 'Compiler et enregistrer le document en PDF via Typst',
                command: 'mk4.exportPdf',
            }),

            // Export source Typst
            new vscode.CodeLens(topRange, {
                title:   '$(file-code) Exporter en Typst',
                tooltip: 'Générer le fichier source .typ correspondant',
                command: 'mk4.exportTypst',
            }),

            // Sélecteur de thème
            new vscode.CodeLens(topRange, {
                title:   '$(paintcan) Thème…',
                tooltip: 'Changer le thème Typst actif',
                command: 'mk4.selectTheme',
            }),
        ];
    }

    /** Déclenche une mise à jour des lenses (par ex. après changement de config). */
    refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }
}
