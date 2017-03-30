@echo off

call npm install

pushd .vscode-test\js-project
call npm install
popd

pushd .vscode-test\jsx-project
call npm install
popd

pushd .vscode-test\ts-project
call npm install
popd

pushd .vscode-test\tsx-project
call npm install
popd

pushd .vscode-test\webpack-project
call npm install
popd