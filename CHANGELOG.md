# Change Log
All notable changes to the "vscode-mocha-test-runner" extension will be documented in this file.

## 0.0.1 - 2017_03_29
- Initial release

## 0.0.2 - 2017_04_19
- Codelens resolved with typescript compiler -  more reliable than regex
- Added setup option for mocha - ability to configure enviroment before mocha starts (Ex: jsdom configuration)
- Added command for running all tests in project

## 0.0.3 - 2017_04_26
- Codelens provider rewriten - shows counts if suceed, failed test on describe
- TestRunner rewriten - no longer spawn child process for tests

## 0.0.4 - 2017_04_28
- Writen Readme.md
- Added output channel for showing mocha output - 'Mocha test runner'
- Added shortcuts for 'run-all' and 'run-file' commands
- First published version

## 0.0.5 - 2017_04_29
- Added error handling

## 0.0.6 - 2017_04_29
- Bug fixing from 0.0.5

## 0.0.7 - 2017_05_02
- Added ability to run single test in debug mode

## 0.0.14 - 2017_05_03
- Fixed bug: Unhandled exception when starting mocha in typescript code, that cannot be successfully compiled.