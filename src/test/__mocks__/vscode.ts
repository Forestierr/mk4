// Mock minimal du module 'vscode' pour les tests unitaires
// Couvre les APIs utilisées par parser.ts et extension.ts

export const workspace = {
    getConfiguration: (_section?: string) => ({
        get: <T>(key: string, defaultValue?: T): T | undefined => {
            if (key === 'typst.defaultTheme') {
                return 'default' as any;
            }
            if (key === 'typst.customThemePath') {
                return '' as any;
            }
            return defaultValue;
        }
    })
};

export enum DiagnosticSeverity {
    Error = 0,
    Warning = 1,
    Information = 2,
    Hint = 3
}

export class Range {
    constructor(
        public readonly startLine: number,
        public readonly startCharacter: number,
        public readonly endLine: number,
        public readonly endCharacter: number
    ) {}
}

export class Diagnostic {
    public source: string = '';
    constructor(
        public readonly range: Range,
        public readonly message: string,
        public readonly severity: DiagnosticSeverity
    ) {}
}
