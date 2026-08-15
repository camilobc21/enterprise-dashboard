@echo off
setlocal

REM Starts the local development server through local CMD executables.
call "%~dp0node_modules\.bin\cross-env.cmd" NODE_ENV=development "%~dp0node_modules\.bin\tsx.cmd" watch "%~dp0server\_core\index.ts"
