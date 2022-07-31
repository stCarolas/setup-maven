import * as path from 'path';

import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import * as semver from 'semver';
import { HttpClient, HttpCodes } from '@actions/http-client';

import { getVersionFromToolcachePath } from './utils';

const DOWNLOAD_BASE_URL = 'https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven';

export async function getAvailableVersions(): Promise<string[]> {
  const resourceUrl = `${DOWNLOAD_BASE_URL}/maven-metadata.xml`;
  const http = new HttpClient('setup-maven', undefined, { allowRetries: true });

  core.info(`Downloading Maven versions manifest from ${resourceUrl} ...`);
  const response = await http.get(resourceUrl);
  const body = await response.readBody();

  if (response.message.statusCode !== HttpCodes.OK || !body) {
    throw new Error(`Unable to get available versions from ${resourceUrl}`);
  }

  const availableVersions = body.match(/(?<=<version>)[^<>]+(?=<\/version>)/g) ?? [];
  core.debug(`Available Maven versions: [${availableVersions.toString()}]`);

  return availableVersions;
}

/**
 * Download and extract a specified Maven version to the tool-cache.
 */
export async function downloadMaven(version: string): Promise<string> {
  const toolDirectoryName = `apache-maven-${version}`;
  const downloadUrl = `${DOWNLOAD_BASE_URL}/${version}/${toolDirectoryName}-bin.tar.gz`;

  core.info(`Downloading Maven ${version} from ${downloadUrl} ...`);
  const downloadPath = await tc.downloadTool(downloadUrl);

  const extractedPath = await tc.extractTar(downloadPath);

  const toolRoot = path.join(extractedPath, toolDirectoryName);
  return tc.cacheDir(toolRoot, 'maven', version);
}

export async function findVersionForDownload(versionSpec: string): Promise<string> {
  const availableVersions = (await getAvailableVersions()).map(ver => ver.trim());

  const resolvedVersion = semver.maxSatisfying(availableVersions, versionSpec);
  if (!resolvedVersion) {
    throw new Error(`Could not find satisfied version for SemVer ${versionSpec}`);
  }

  core.debug(`Resolved version for download: ${resolvedVersion}`);
  return resolvedVersion;
}

export async function setupMaven(versionSpec: string, installedVersion?: string): Promise<string> {
  let toolPath = tc.find('maven', versionSpec);
  let resolvedVersion = getVersionFromToolcachePath(toolPath);

  if (installedVersion) {
    if (!toolPath || semver.gte(installedVersion, resolvedVersion)) {
      core.info(
        `Use system Maven version ${installedVersion} instead of the cached one: ${resolvedVersion}`
      );

      return installedVersion;
    }
  } else if (!toolPath) {
    resolvedVersion = await findVersionForDownload(versionSpec);

    toolPath = await downloadMaven(resolvedVersion);
  }

  core.addPath(path.join(toolPath, 'bin'));
  return resolvedVersion;
}
