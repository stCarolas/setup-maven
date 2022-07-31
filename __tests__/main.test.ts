import * as core from '@actions/core';

import { getActiveMavenVersion } from '../src/utils';
import { setupMaven } from '../src/installer';
import { run } from '../src/main';

// Mocking modules
jest.mock('@actions/core');
jest.mock('../src/utils');
jest.mock('../src/installer');

const DEFAULT_VERSION = '3';

describe('failed to run with invalid inputs', () => {
  it.each([
    ['maven-version', { 'maven-version': ' foo-3!' }] // eslint-disable-line
  ])('%s', async (name: string, inputs: Readonly<Record<string, string>>) => {
    (core.getInput as jest.Mock).mockImplementation((key: string) => inputs[key]);

    await run();
    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`[Ii]nvalid .*'${inputs[name]}'`))
    );
  });
});

describe('run with valid inputs', () => {
  it('setups default version when no Maven is installed', async () => {
    (core.getInput as jest.Mock).mockReturnValue('');
    (getActiveMavenVersion as jest.Mock).mockResolvedValue(undefined);
    (setupMaven as jest.Mock).mockResolvedValue('foo');

    await run();
    expect(setupMaven).toHaveBeenCalledWith(DEFAULT_VERSION, undefined);
    expect(core.setOutput).toHaveBeenCalledWith('version', 'foo');
  });

  it('setups when installed Maven is different with version input', async () => {
    (core.getInput as jest.Mock).mockReturnValue('3.3');
    (getActiveMavenVersion as jest.Mock).mockResolvedValue('3.5.2');
    (setupMaven as jest.Mock).mockResolvedValue(DEFAULT_VERSION);

    await run();
    expect(setupMaven).toHaveBeenCalledWith('3.3', undefined);
    expect(core.setOutput).toHaveBeenCalledWith('version', DEFAULT_VERSION);
  });

  it('setups when installed Maven is correspond with version input', async () => {
    (core.getInput as jest.Mock).mockReturnValue('3.x');
    (getActiveMavenVersion as jest.Mock).mockResolvedValue('3.3.9');
    (setupMaven as jest.Mock).mockResolvedValue('');

    await run();
    expect(setupMaven).toHaveBeenCalledWith('3.x', '3.3.9');
    expect(core.setOutput).toHaveBeenCalledWith('version', '');
  });
});
