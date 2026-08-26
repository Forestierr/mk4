// Mock minimal du module 'vscode' pour les tests unitaires
// Couvre les APIs utilisées par parser.ts, extension.ts et les providers.

export const Uri = {
    file: (fsPath: string) => ({ fsPath, toString: () => `file://${fsPath}` }),
    parse: (url: string) => ({ fsPath: url, toString: () => url })
};

export const workspace = {
    textDocuments: [] as any[],
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

export enum CompletionItemKind {
    Text = 0,
    Method = 1,
    Function = 2,
    Constructor = 3,
    Field = 4,
    Variable = 5,
    Class = 6,
    Interface = 7,
    Module = 8,
    Property = 9,
    Unit = 10,
    Value = 11,
    Enum = 12,
    Keyword = 13,
    Snippet = 14,
    Color = 15,
    File = 16,
    Reference = 17,
    Folder = 18,
    EnumMember = 19,
    Constant = 20,
    Struct = 21,
    Event = 22,
    Operator = 23,
    TypeParameter = 24,
}

export class CompletionItem {
    public insertText?: string;
    public detail?: string;
    constructor(
        public readonly label: string,
        public readonly kind?: CompletionItemKind
    ) {}
}

