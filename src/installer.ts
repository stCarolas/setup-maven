import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

import * as path from 'path';

export async function getMaven(version: string) {
  let toolPath = tc.find('maven', version);

  if (!toolPath) {
    toolPath = await downloadMaven(version);
  }

  core.addPath(path.join(toolPath, 'bin'));
}

const DOWNLOAD_BASE_URL = 'https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven';

async function downloadMaven(version: string): Promise<string> {
  const toolDirectoryName = `apache-maven-${version}`;
  const downloadUrl = `${DOWNLOAD_BASE_URL}/${version}/${toolDirectoryName}-bin.tar.gz`;

  core.info(`Downloading Maven ${version} from ${downloadUrl} ...`);
  const downloadPath = await tc.downloadTool(downloadUrl);

  const extractedPath = await tc.extractTar(downloadPath);

  const toolRoot = path.join(extractedPath, toolDirectoryName);
  return tc.cacheDir(toolRoot, 'maven', version);
}
