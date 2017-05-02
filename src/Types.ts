// !! no imports here !! (used by child_process)

export type TestState = 'Inconclusive' | 'Running' | 'Success' | 'Fail';
export type TestStates = { [title: string]: TestState };
export type FileTestStates = { [fileName: string]: TestStates };
export type TestsResults = { [file: string]: TestResult[] };
export type TestResult = { selector: string[], err?: any };

export type TestProcessArgs = {
    rootPath: string, // config.files.rootPath
    workspacePath: string, // vscode.workspace.rootPath
    ignore: string[], // config.files.ignore
    glob: string;  // config.glob, '**/*.test.js'
    setup: string[]; // config.files.setup
    options: any; // config.options

    fileName?: string;
    grep?: string;
    fileSelectors?: string[];
};