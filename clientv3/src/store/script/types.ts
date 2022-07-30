import { Model } from '@/store/types'

// Just a copy from the server
export enum ScriptType { PYTHON = 0, NODE = 1, SH = 2, RUBY = 4, JAVASCRIPT = 9 };

//Monoca potential types: ["plaintext", "abap", "apex", "azcli", "bat", "cameligo", "clojure", "coffeescript", "c", "cpp", "csharp", "csp", "css", "dockerfile", "fsharp", "go", "graphql", "handlebars", "html", "ini", "java", "javascript", "json", "kotlin", "less", "lua", "markdown", "mips", "msdax", "mysql", "objective-c", "pascal", "pascaligo", "perl", "pgsql", "php", "postiats", "powerquery", "powershell", "pug", "python", "r", "razor", "redis", "redshift", "restructuredtext", "ruby", "rust", "sb", "scheme", "scss", "shell", "sol", "aes", "sql", "st", "swift", "tcl", "twig", "typescript", "vb", "xml", "yaml"]
export const scriptTypesForMonaco = {
  [ScriptType.PYTHON]: 'python',
  [ScriptType.NODE]: 'nodejs',
  [ScriptType.SH]: 'shell',
  [ScriptType.RUBY]: 'ruby',
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