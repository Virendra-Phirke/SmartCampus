const { spawnSync } = require('child_process');
const result = spawnSync('npx.cmd', ['eslint', '.', '--format', 'compact'], { encoding: 'utf8', shell: true });
console.log(result.stdout || result.stderr);
