import * as path from 'path';
import * as core from '@actions/core';
import * as exec from '@actions/exec';

export function getVersionFromToolcachePath(toolPath: string): string {
  return !toolPath ? toolPath : path.basename(path.dirname(toolPath));
}

/**
 * Determine version of the current used Maven.
 */
export async function getActiveMavenVersion(): Promise<string | undefined> {
  try {
    const { stdout } = await exec.getExecOutput('mvn', ['-v'], { silent: true });

    const found = /^[^\d]*(\S+)/.exec(stdout);
    const installedVersion = !found ? '' : found[1];
    core.debug(`Retrieved activated Maven version: ${installedVersion}`);

    return installedVersion;
  } catch (err) {
    core.info(`Failed to get activated Maven version. ${(err as Error).message}`);
  }

  return undefined;
}
