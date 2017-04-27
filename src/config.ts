import * as vscode from 'vscode';

interface Config {
    options: any;
    files: {
        rootPath: string;
        ignore: string[];
    };
    env: any;
    setup: string;
}

export const config: Config = vscode.workspace.getConfiguration('mocha') as any;