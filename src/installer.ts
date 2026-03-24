// Load tempDirectory before it gets wiped by tool-cache
let tempDirectory = process.env['RUNNER_TEMPDIRECTORY'] || '';

import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import * as path from 'path';

if (!tempDirectory) {
  let baseLocation: string;
  if (process.platform === 'win32') {
    baseLocation = process.env['USERPROFILE'] || 'C:\\';
  } else {
    if (process.platform === 'darwin') {
      baseLocation = '/Users';
    } else {
      baseLocation = '/home';
    }
  }
  tempDirectory = path.join(baseLocation, 'actions', 'temp');
}

export async function getMaven(version: string, mirror: string) {
  let toolPath: string;
  toolPath = tc.find('maven', version);

  if (!toolPath) {
    toolPath = await downloadMaven(version, mirror);
  }

  toolPath = path.join(toolPath, 'bin');
  core.addPath(toolPath);
}

function get_server_url(mirror: string) {
  if (mirror && (mirror.indexOf("http") === 0)) {
    return mirror;
  }
  switch (mirror) {
    case "aliyun":
      return "https://maven.aliyun.com/repository/public";
    default:
      break;
  }
  return "https://repo.maven.apache.org/maven2";
}

async function downloadMaven(version: string, mirror: string): Promise<string> {
  const toolDirectoryName = `apache-maven-${version}`;
  const downloadUrl = `${get_server_url(mirror)}/org/apache/maven/apache-maven/${version}/apache-maven-${version}-bin.tar.gz`;
  console.log(`downloading ${downloadUrl}`);

  try {
    const downloadPath = await tc.downloadTool(downloadUrl);
    const extractedPath = await tc.extractTar(downloadPath);
    let toolRoot = path.join(extractedPath, toolDirectoryName);
    return await tc.cacheDir(toolRoot, 'maven', version);
  } catch (err) {
    throw err;
  }
}
