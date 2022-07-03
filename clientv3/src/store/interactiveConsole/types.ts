export interface InteractiveConsole {
  lambdaRuntime?: string;
  lambdaMemory?: number;
  lambdaTimeout?: string;
  lambdaDependencies?: string;
}

export interface InteractiveConsoleState {
  selectedCopy: InteractiveConsole;
  selected: InteractiveConsole;
  _storeName: string;
}
