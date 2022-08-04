import * as core from '@actions/core';
import * as semver from 'semver';

import { getActiveMavenVersion } from './utils';
import { setupMaven } from './installer';

const DEFAULT_VERSION = '3';

function resolveVersionInput(): string {
  const versionSpec = core.getInput('maven-version') || DEFAULT_VERSION;

  if (!semver.validRange(versionSpec)) {
    throw new Error(`Invalid SemVer notation '${versionSpec}' for a Maven version`);
  }

  return versionSpec;
}

export async function run(): Promise<void> {
  try {
    const versionSpec = resolveVersionInput();

    let installedVersion = await getActiveMavenVersion();
    if (installedVersion && !semver.satisfies(installedVersion, versionSpec)) {
      installedVersion = undefined;
    }

    installedVersion = await setupMaven(versionSpec, installedVersion);
    core.setOutput('version', installedVersion);
  } catch (err) {
    core.setFailed((err as Error).message);
  }
}
