// !! no imports here !! (used by child_process)

export type TestState = 'Inconclusive' | 'Running' | 'Success' | 'Fail';
export type TestStates = { [title: string]: TestState };
export type FileTestStates = { [fileName: string]: TestStates };
export type TestsResults = { [file: string]: TestResult[] };
export type TestResult = { selector: string[], state: 'Success' | 'Fail' };

export type TestProcessRequest = {
    rootPath: string,
    workspacePath: string,
    ignore: string[],
    glob: string;
    setup: string;
    options: any;

    fileName?: string;
    grep?: string;
    fileSelectors?: string[];
};

export type TestProcessResponse = {
    results: TestsResults;
    stdout: string;
};