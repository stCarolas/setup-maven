import * as path from 'path';
import * as core from '@actions/core';
import * as exec from '@actions/exec';

export function getVersionFromToolcachePath(toolPath: string) {
  return !toolPath ? toolPath : path.basename(path.dirname(toolPath));
}

/**
 * Determine version of the current used Maven.
 */
export async function getActiveMavenVersion(): Promise<string | undefined> {
  try {
    const { output } = await getExecOutput('mvn', ['-v']);

    const found = output.match(/^[^\d]*(\S+)/);
    const installedVersion = !found ? '' : found[1];
    core.debug(`Retrieved activated Maven version: ${installedVersion}`);

    return installedVersion;
  } catch (error) {
    core.info(`Failed to get activated Maven version. ${error}`);
  }

  return undefined;
}

/**
 * Exec a command and get the standard output.
 *
 * @throws {Error} If the exit-code is non-zero.
 */
export async function getExecOutput(
  command: string,
  args?: string[]
): Promise<{ exitCode: number; output: string }> {
  let output = '';

  const exitCode = await exec.exec(command, args, {
    silent: true,
    listeners: {
      stdout: (data: Buffer) => (output += data.toString())
    }
  });

  return { exitCode, output };
}
