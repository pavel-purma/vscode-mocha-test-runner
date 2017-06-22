import * as vscode from 'vscode';

interface Config {
    enabled: boolean,
    options?: any;
    env?: any;
    glob: string;
    debugPort: number;
    sourceDir: string;
    outputDir: string;
    setupFile: string;
    ignoreGlobs: string[];    
    debugTrace: string;
    compilerScript: string;
}

export const config: Config = vscode.workspace.getConfiguration('mocha') as any;
