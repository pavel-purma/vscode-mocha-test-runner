import * as vscode from 'vscode';

interface Config {
    options: any;
    files: {
        glob: string;
        ignore: string[];
    };
    env: any;
    compiler: string;
    runTestsOnSave: boolean;
}

export const config: Config = vscode.workspace.getConfiguration('mocha') as any;