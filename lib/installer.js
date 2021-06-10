"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMaven = void 0;
// Load tempDirectory before it gets wiped by tool-cache
let tempDirectory = process.env['RUNNER_TEMPDIRECTORY'] || '';
const core = __importStar(require("@actions/core"));
const tc = __importStar(require("@actions/tool-cache"));
const path = __importStar(require("path"));
if (!tempDirectory) {
    let baseLocation;
    if (process.platform === 'win32') {
        baseLocation = process.env['USERPROFILE'] || 'C:\\';
    }
    else {
        if (process.platform === 'darwin') {
            baseLocation = '/Users';
        }
        else {
            baseLocation = '/home';
        }
    }
    tempDirectory = path.join(baseLocation, 'actions', 'temp');
}
async function getMaven(version) {
    let toolPath;
    toolPath = tc.find('maven', version);
    if (!toolPath) {
        toolPath = await downloadMaven(version);
    }
    toolPath = path.join(toolPath, 'bin');
    core.addPath(toolPath);
}
exports.getMaven = getMaven;
async function downloadMaven(version) {
    const toolDirectoryName = `apache-maven-${version}`;
    const downloadUrl = `https://apache.org/dyn/closer.cgi?filename=maven/maven-3/${version}/binaries/${toolDirectoryName}-bin.tar.gz&action=download`;
    console.log(`downloading ${downloadUrl}`);
    try {
        const downloadPath = await tc.downloadTool(downloadUrl);
        const extractedPath = await tc.extractTar(downloadPath);
        let toolRoot = path.join(extractedPath, toolDirectoryName);
        return await tc.cacheDir(toolRoot, 'maven', version);
    }
    catch (err) {
        throw err;
    }
}
