const pkg_1 = require("pkg");

const pkg_path = './AgentDownloader'

pkg_1.exec([`./AgentDownloader/download_sg_agent_win.js`, '--config', `${pkg_path}/package.json`, '--targets', 'node10-win-x64', '--out-path', `./${pkg_path}`]);
