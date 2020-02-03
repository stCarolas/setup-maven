"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
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
function getMaven(version) {
    return __awaiter(this, void 0, void 0, function* () {
        let toolPath;
        toolPath = tc.find('maven', version);
        if (!toolPath) {
            toolPath = yield downloadMaven(version);
        }
        toolPath = path.join(toolPath, 'bin');
        core.addPath(toolPath);
    });
}
exports.getMaven = getMaven;
function downloadMaven(version) {
    return __awaiter(this, void 0, void 0, function* () {
        const toolDirectoryName = `apache-maven-${version}`;
        const downloadUrl = `https://archive.apache.org/dist/maven/maven-3/${version}/binaries/${toolDirectoryName}-bin.tar.gz`;
        console.log(`downloading ${downloadUrl}`);
        try {
            const downloadPath = yield tc.downloadTool(downloadUrl);
            const extractedPath = yield tc.extractTar(downloadPath);
            let toolRoot = path.join(extractedPath, toolDirectoryName);
            return yield tc.cacheDir(toolRoot, 'maven', version);
        }
        catch (err) {
            throw err;
        }
    });
}
