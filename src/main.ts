import * as core from '@actions/core';
import * as semver from 'semver';

import { getActiveMavenVersion } from './utils';
import { setupMaven } from './installer';

function resolveVersionInput(): string {
  const versionSpec = core.getInput('maven-version') || '3';

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
