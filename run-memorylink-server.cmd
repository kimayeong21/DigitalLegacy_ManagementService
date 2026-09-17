@echo off
cd /d "%~dp0"
node.exe node_modules/esbuild/bin/esbuild src/index.tsx --bundle --platform=node --format=esm --outfile=.tmp/app-bundle.mjs --external:@cloudflare/workers-types
node.exe dev-node-server.mjs > node-server.log 2>&1
