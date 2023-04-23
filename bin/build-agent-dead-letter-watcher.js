const pkg_1 = require('pkg');

const pkg_path = './server/dist/workers/pkg_agent_dead_letter_watcher';
const out_path = process.argv[2];
const targets = process.argv[3];

pkg_1.exec([
    `./server/dist/RunServerWorkers.js`,
    '--config',
    `${pkg_path}/package.json`,
    '--targets',
    targets,
    '--out-path',
    `./${out_path}`,
]);
