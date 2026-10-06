import {spawnSync} from 'node:child_process';
// React test renderers require act(), which React disables in production.
// Keep this override scoped to tests; Next's build retains its caller's mode.
const result=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs',...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,NODE_ENV:'test'}});
if(result.error)throw result.error;
process.exit(result.status??1);
