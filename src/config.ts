import * as vscode from 'vscode';

interface Config {
    enabled: boolean | null,
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
    nodeExec: string;

    update: (section: string, value: any) => void;
}

const get = <T>(section: string) => vscode.workspace.getConfiguration('mocha').get<T>(section);

export const config: Config = {
    get enabled() { return get<boolean | null>('enabled'); },
    get options() { return get<any>('options'); },
    get env() { return get<any>('env'); },
    get glob() { return get<string>('glob'); },
    get debugPort() { return get<number>('debugPort'); },
    get sourceDir() { return get<string>('sourceDir'); },
    get outputDir() { return get<string>('outputDir'); },
    get setupFile() { return get<string>('setupFile'); },
    get ignoreGlobs() { return get<string[]>('ignoreGlobs'); },
    get debugTrace() { return get<string>('debugTrace'); },
    get compilerScript() { return get<string>('compilerScript'); },
    get nodeExec() { return get<string>('nodeExec'); },
    update: (section: string, value: any) => {
        vscode.workspace.getConfiguration('mocha').update(section, value);
    }
};
