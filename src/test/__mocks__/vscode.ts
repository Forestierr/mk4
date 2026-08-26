// Mock minimal du module 'vscode' pour les tests unitaires
// Couvre les APIs utilisées par parser.ts, extension.ts et les providers.

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

export class Position {
    constructor(
        public readonly line: number,
        public readonly character: number
    ) {}
}

export class Range {
    constructor(
        public readonly startLine: number,
        public readonly startCharacter: number,
        public readonly endLine: number,
        public readonly endCharacter: number
    ) {}
}

export class Location {
    constructor(
        public readonly uri: any,
        public readonly range: Range
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

export class MarkdownString {
    public value: string = '';
    public isTrusted: boolean = false;
    public supportHtml: boolean = false;

    appendMarkdown(text: string): this {
        this.value += text;
        return this;
    }
}

export class Hover {
    constructor(
        public readonly contents: MarkdownString,
        public readonly range?: Range
    ) {}
}
