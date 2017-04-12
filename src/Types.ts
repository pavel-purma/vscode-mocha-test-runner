export type FileTestsInfo = {
    [file: string]: TestsInfo;
};

export type TestsInfo = {
    [describe: string]: DescribeInfo;
};

export type DescribeInfo = {
    [describeOrIt: string]: DescribeInfo | ItInfo;
};

export type ItInfo = {
    succeed: boolean;
};

export type MochaTestInfo = {
    file: string;
    fullName: string;
    name: string;
    suitePath: string[];
}

export type MochaTestResult = {
}