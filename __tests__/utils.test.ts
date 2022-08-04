import * as path from 'path';
import * as child from 'child_process';
import { EventEmitter } from 'events';

import * as core from '@actions/core';

import { getActiveMavenVersion, getVersionFromToolcachePath } from '../src/utils';

// Mocking modules
jest.mock('child_process');
jest.mock('@actions/core');

const MVN_PATH = path.join(__dirname, 'data');
const REAL_VERSION = '3.5.2';

describe('getVersionFromToolcachePath', () => {
  it.each([
    ['', ''],
    ['foo', '.'],
    [path.join('foo', '1.0', 'x64'), '1.0'],
    [`bar${path.sep}foo${path.sep}`, 'bar']
  ])('%s -> %s', (toolPath: string, expected: string) => {
    const actual = getVersionFromToolcachePath(toolPath);

    expect(actual).toBe(expected);
  });
});

describe('getActiveMavenVersion', () => {
  const ORIGINAL_PATH = process.env.PATH;
  const EMIT_AT = 21;

  afterEach(() => {
    process.env.PATH = ORIGINAL_PATH;
  });

  it('gets real version by `mvn` command', async () => {
    process.env.PATH = `${MVN_PATH}${path.delimiter}${ORIGINAL_PATH ?? ''}`;

    const cp = jest.requireActual<typeof child>('child_process');
    (child.spawn as jest.Mock).mockImplementation(cp.spawn);

    const installedVersion = await getActiveMavenVersion();

    expect(installedVersion).toBe(REAL_VERSION);
    expect(core.debug).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`Retrieved.* version: ${REAL_VERSION}`, 'i'))
    );
  });

  it('returns null if no Maven is installed', async () => {
    process.env.PATH = '';
    const installedVersion = await getActiveMavenVersion();

    expect(installedVersion).toBeUndefined();
    expect(core.info).toHaveBeenCalledWith(
      expect.stringMatching(/Failed.* version.* Unable.* locate executable file: mvn/i)
    );
  });

  it('returns null if `mvn` command is failed', async () => {
    process.env.PATH = MVN_PATH;
    const cp = new EventEmitter();
    (child.spawn as jest.Mock).mockReturnValue(cp);

    setTimeout(() => cp.emit('close', EMIT_AT), EMIT_AT);
    const installedVersion = await getActiveMavenVersion();

    expect(installedVersion).toBeUndefined();
    expect(core.info).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`Failed.* version.* process.* exit code ${EMIT_AT}`, 'i'))
    );
  });

  it('returns empty if `mvn` command is incorrect', async () => {
    process.env.PATH = MVN_PATH;

    const cp = (new EventEmitter() as unknown) as EventEmitter & { stdout: EventEmitter };
    (child.spawn as jest.Mock).mockReturnValue((cp.stdout = cp));

    setTimeout(() => cp.emit('data', 'foo') && cp.emit('close', 0), EMIT_AT);
    const installedVersion = await getActiveMavenVersion();

    expect(installedVersion).toBe('');
    expect(core.debug).toHaveBeenCalledTimes(1);
  });
});
