export enum ValueFormat {
    TEXT = 'plaintext',
    YAML = 'yaml',
    JSON = 'json',
}

export interface Variable {
    format: ValueFormat;
    sensitive: boolean;
    value: string;
    key: string;
}

export type KeylessVariable = Omit<Variable, 'key'>;

export interface VariableMap {
    [key: string]: KeylessVariable;
}
