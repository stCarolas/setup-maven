import * as core from '@actions/core';
import * as semver from 'semver';

import { getActiveMavenVersion } from './utils';
import { setupMaven } from './installer';

export async function run() {
  try {
    const versionSpec = core.getInput('maven-version') || '3';

    if (!semver.validRange(versionSpec)) {
      core.setFailed(`Invalid SemVer notation '${versionSpec}' for a Maven version`);
      return;
    }

    let installedVersion = await getActiveMavenVersion();
    if (installedVersion && !semver.satisfies(installedVersion, versionSpec)) {
      installedVersion = undefined;
    }

    installedVersion = await setupMaven(versionSpec, installedVersion);
    core.setOutput('version', installedVersion);
  } catch (error) {
    core.setFailed(error.toString());
  }
}
