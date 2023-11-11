import { Model } from '@/store/types'

// Just a copy from the server
export type EditorTheme = 'vs' | 'vs-dark' | 'hc-black';
export enum ScriptType {
  PYTHON = 0,
  NODE = 1,
  SH = 2,
  CMD = 3,
  RUBY = 4,
  LUA = 5,
  PERL = 6,
  POWERSHELL = 8,
  JAVASCRIPT = 9,
};

//Monoca potential types: ["plaintext", "abap", "apex", "azcli", "bat", "cameligo", "clojure", "coffeescript", "c", 
// "cpp", "csharp", "csp", "css", "dockerfile", "fsharp", "go", "graphql", "handlebars", "html", "ini", "java", 
// "javascript", "json", "kotlin", "less", "lua", "markdown", "mips", "msdax", "mysql", "objective-c", "pascal", 
// "pascaligo", "perl", "pgsql", "php", "postiats", "powerquery", "powershell", "pug", "python", "r", "razor", 
// "redis", "redshift", "restructuredtext", "ruby", "rust", "sb", "scheme", "scss", "shell", "sol", "aes", "sql", 
// "st", "swift", "tcl", "twig", "typescript", "vb", "xml", "yaml"]
export const scriptTypesForMonaco = {
  [ScriptType.PYTHON]: 'python',
  [ScriptType.NODE]: 'nodejs',
  [ScriptType.SH]: 'shell',
  [ScriptType.CMD]: 'bat',
  [ScriptType.POWERSHELL]: 'powershell',
  [ScriptType.RUBY]: 'ruby',
  [ScriptType.LUA]: 'lua',
  [ScriptType.PERL]: 'perl',
  [ScriptType.JAVASCRIPT]: 'javascript',
};

export interface Script extends Model {
  id?: string,
  _teamId?: string,
  _originalAuthorUserId: string,
  _lastEditedUserId: string,
  name: string,
  scriptType: ScriptType,
  code: string, // this will always be in base 64 encoding on the client and the API
  lastEditedDate: Date,
  teamEditable?: boolean,
  sggElems?: string[]
};