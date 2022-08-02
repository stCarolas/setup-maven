import * as os from 'os';
import * as path from 'path';
import { existsSync, promises as fs } from 'fs';

import * as core from '@actions/core';

import * as utils from '../src/utils';
import * as installer from '../src/installer';
import { run } from '../src/main';

// Mocking modules
jest.mock('@actions/core');

const MVN_PATH = path.join(__dirname, 'data');
const DEFAULT_VERSION = '3';
const REAL_VERSION = '3.5.2';
const CACHE_PATH = path.join(__dirname, 'runner');

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
  it.each([
    // Default version + no Maven is installed
    [{ setup: 'foo', spec: '' }, [DEFAULT_VERSION, undefined]],
    [{ active: '', setup: '3.0', spec: ' * ' }, [' * ', '']],
    // Installed version !~ version input
    [{ active: '3.5.2', setup: DEFAULT_VERSION, spec: ' 3.3' }, [' 3.3', undefined]],
    // Installed version =~ version input
    [{ active: '3.3.9', setup: '', spec: '3.x ' }, ['3.x ', '3.3.9']]
  ])(
    '%o -> %j',
    async (
      version: Readonly<{ spec: string; active?: string; setup: string }>,
      expected: readonly (string | undefined)[]
    ) => {
      (core.getInput as jest.Mock).mockReturnValue(version.spec);
      jest.spyOn(utils, 'getActiveMavenVersion').mockResolvedValue(version.active);
      const spySetup = jest.spyOn(installer, 'setupMaven').mockResolvedValue(version.setup);

      await run();
      expect(spySetup).toHaveBeenCalledWith(...expected);
      expect(core.setOutput).toHaveBeenCalledWith('version', version.setup);
    }
  );
});

describe('integration tests', () => {
  const ORIGINAL_PATH = process.env.PATH;
  const TEST_VERSION = '3.1.1';
  const TOOL_PATH = path.join(CACHE_PATH, 'maven', TEST_VERSION, os.arch());

  process.env.RUNNER_TEMP = os.tmpdir();
  process.env.RUNNER_TOOL_CACHE = CACHE_PATH;

  beforeEach(() => {
    process.env.PATH = `${MVN_PATH}${path.delimiter}${ORIGINAL_PATH ?? ''}`;
  });

  afterEach(async () => {
    process.env.PATH = ORIGINAL_PATH;
    await fs.rmdir(CACHE_PATH, { recursive: true });
  });

  it('uses system Maven if real version =~ default version', async () => {
    (core.getInput as jest.Mock).mockReturnValue('');

    await run();
    expect(core.addPath).not.toHaveBeenCalled();
    expect(core.setOutput).toHaveBeenCalledWith('version', REAL_VERSION);
  });

  it('install and cache a specific Maven version', async () => {
    (core.getInput as jest.Mock).mockReturnValue(' ~3.1.0');

    await run();
    expect(core.info).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`Downloading Maven ${TEST_VERSION} from`, 'i'))
    );

    expect(core.addPath).toHaveBeenCalledWith(path.join(TOOL_PATH, 'bin'));
    expect(core.setOutput).toHaveBeenCalledWith('version', TEST_VERSION);

    expect(existsSync(`${TOOL_PATH}.complete`)).toBe(true);
  });

  it('uses system Maven if real version > cached version', async () => {
    await fs.mkdir(TOOL_PATH, { recursive: true });
    await fs.writeFile(`${TOOL_PATH}.complete`, '');
    (core.getInput as jest.Mock).mockReturnValue('3.x ');

    await run();
    expect(core.info).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(`Use.* version ${REAL_VERSION} instead of.* ${TEST_VERSION}`, 'i')
      )
    );

    expect(core.addPath).not.toHaveBeenCalled();
    expect(core.setOutput).toHaveBeenCalledWith('version', REAL_VERSION);
  });
});
