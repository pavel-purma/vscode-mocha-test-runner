import * as vscode from 'vscode';

interface Config {
    options?: {
        ui?: string;
        timeout?: number;
        slow?: number;
        bail?: boolean;
    };
    env?: any;
    files: {
        rootPath: string;
        ignore: string[];
        setup?: string[];
    };
}

export const config: Config = vscode.workspace.getConfiguration('mocha') as any;