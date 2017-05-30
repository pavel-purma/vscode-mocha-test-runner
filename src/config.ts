import * as vscode from 'vscode';

interface Config {
    options?: any;
    env?: any;
    glob: string;
    debugPort: number;
    sourceDir: string;
    outputDir: string;
    setupFiles: string[];
    ignoreFiles: string[];    
    debugTrace: string;
}

export const config: Config = vscode.workspace.getConfiguration('mocha') as any;
