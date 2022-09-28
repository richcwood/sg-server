export enum LangSyntax {
    TEXT = 'plaintext',
    YAML = 'yaml',
    JSON = 'json',
}

export interface Variable {
    sensitive: boolean;
    value: string;
    key: string;
}
