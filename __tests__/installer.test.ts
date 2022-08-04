import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as core from '@actions/core';
import * as hm from '@actions/http-client';
import * as tc from '@actions/tool-cache';

import * as installer from '../src/installer';
import { getVersionFromToolcachePath } from '../src/utils';

// Mocking modules
jest.mock('@actions/core');

const CACHE_PATH = path.join(__dirname, 'runner');

function mockHttpClientGet(responseBody: string, statusCode = hm.HttpCodes.OK): void {
  jest.spyOn(hm, 'HttpClient').mockReturnValue(({
    get: jest.fn().mockResolvedValue({
      message: { statusCode, statusMessage: '' },
      readBody: jest.fn().mockResolvedValue(responseBody)
    })
  } as unknown) as hm.HttpClient);
}

function createXmlManifest(...versions: readonly string[]): string {
  return versions.map(ver => `<version>${ver}</version>`).join();
}

describe('getAvailableVersions', () => {
  it('loads real available versions', async () => {
    const availableVersions = await installer.getAvailableVersions();

    expect(core.info).toHaveBeenCalledWith(expect.stringMatching(/Downloading.* versions.* from/i));
    expect(core.debug).toHaveBeenCalledWith(
      expect.stringMatching(/Available.* versions: \[.*,3.1.1,.*]/i)
    );

    expect(availableVersions).toStrictEqual(
      expect.arrayContaining(['3.0', '3.2.5', '3.3.3', '3.8.2'])
    );
  });

  it('failed to download versions manifest', async () => {
    mockHttpClientGet('', 0);

    await expect(installer.getAvailableVersions()).rejects.toThrow(
      /Unable to get available versions from/i
    );
    expect(core.info).toHaveBeenCalledTimes(1);
  });

  describe('returns bad versions for incorrect downloaded manifest', () => {
    it.each([
      [` bar${createXmlManifest('')} foo`, []],
      [` ${createXmlManifest(' 1.x', 'foo')}!`, [' 1.x', 'foo']]
    ])('%s -> %j', async (xml: string, expected: readonly string[]) => {
      mockHttpClientGet(xml);

      const availableVersions = await installer.getAvailableVersions();
      expect(availableVersions).toStrictEqual(expected);

      expect(core.info).toHaveBeenCalledTimes(1);
      expect(core.debug).toHaveBeenCalledWith(expect.stringContaining(` [${String(expected)}]`));
    });
  });
});

describe('findVersionForDownload', () => {
  describe('raises error if versionSpec was not matched', () => {
    it.each([
      [' *', ['']],
      ['* ', ['foo', ' ', ' 1.0.x ', '3.0']],
      [' >=3', [' 2.0.1', '!', ' 3.0.x ', '3.3']]
    ])('%s %j', async (spec: string, versions: readonly string[]) => {
      mockHttpClientGet(createXmlManifest(...versions));

      await expect(installer.findVersionForDownload(spec)).rejects.toThrow(
        new RegExp(`not find.* version for.* ${spec}`, 'i')
      );
    });
  });

  describe('returns the best matched correctly', () => {
    it.each([
      [' 1.x', ['foo', '1.0.1', ' 1.1.0 ', '0.1.0 '], '1.1.0'],
      [' * ', ['!', '1.0.1', ' 3.1.0 ', '2.0.1 ', '3.3.0-alpha-1'], '3.1.0'],
      ['>=1 ', [' ', '1.1.0-beta-1', ' 1.0.1 ', ' 1.0.1-1'], '1.0.1']
    ])('%s %j -> %s', async (spec: string, versions: readonly string[], expected: string) => {
      mockHttpClientGet(createXmlManifest(...versions));

      const resolvedVersion = await installer.findVersionForDownload(spec);
      expect(resolvedVersion).toBe(expected);
      expect(core.debug).toHaveBeenCalledWith(expect.stringMatching(/Resolved version/i));
    });
  });
});

describe('download & setup Maven', () => {
  process.env.RUNNER_TEMP = os.tmpdir();
  process.env.RUNNER_TOOL_CACHE = CACHE_PATH;

  describe('downloadMaven', () => {
    const TEST_VERSION = '3.3.3';
    const TOOL_PATH = path.join(CACHE_PATH, 'maven', TEST_VERSION);

    afterEach(() => {
      if (fs.existsSync(TOOL_PATH)) {
        fs.rmdirSync(TOOL_PATH, { recursive: true });
      }
    });

    it('download a real version of Maven', async () => {
      const toolPath = await installer.downloadMaven(TEST_VERSION);

      expect(core.info).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`Downloading Maven ${TEST_VERSION} from`, 'i'))
      );

      expect(fs.existsSync(`${toolPath}.complete`)).toBe(true);
      expect(fs.existsSync(TOOL_PATH)).toBe(true);
      expect(getVersionFromToolcachePath(toolPath)).toBe(TEST_VERSION);
    });

    it('raises error if download failed', async () => {
      mockHttpClientGet('', 1);
      await expect(installer.downloadMaven(TEST_VERSION)).rejects.toThrow(/Unexpected HTTP.* 1/i);

      expect(core.info).toHaveBeenCalledTimes(1);
      expect(core.debug).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to download.* Code\(1\)/i)
      );
    });

    it('raises error when extracting failed', async () => {
      const spyDownload = jest.spyOn(tc, 'downloadTool').mockResolvedValue(__filename);

      await expect(installer.downloadMaven(TEST_VERSION)).rejects.toThrow(
        /process .*tar.* failed.* exit code [1-2]/i
      );

      expect(spyDownload).toHaveBeenCalledWith(expect.stringContaining(TEST_VERSION));
      expect(core.debug).toHaveBeenCalledWith(expect.stringContaining('tar'));
    });
  });

  describe('setupMaven', () => {
    const TEST_VERSION = '3.2.5';
    const TOOL_PATH = path.join(CACHE_PATH, 'maven', TEST_VERSION, os.arch());

    beforeEach(() => {
      fs.mkdirSync(TOOL_PATH, { recursive: true });
      fs.writeFileSync(`${TOOL_PATH}.complete`, '');
    });

    afterEach(() => {
      if (fs.existsSync(TOOL_PATH)) {
        fs.rmdirSync(path.dirname(TOOL_PATH), { recursive: true });
      }
    });

    describe('reuses the cached version of Maven', () => {
      it.each([
        [TEST_VERSION, TEST_VERSION.replace(/\d+$/, 'x '), undefined],
        [TEST_VERSION, TEST_VERSION.replace(/\.\d+$/, ''), TEST_VERSION.replace(/\d+$/, '0 ')]
      ])('%s <- %s', async (expected: string, spec: string, active?: string) => {
        const resolvedVersion = await installer.setupMaven(spec, active);

        expect(resolvedVersion).toBe(expected);
        expect(core.addPath).toHaveBeenCalledWith(
          expect.stringMatching(new RegExp(`\\b${expected}\\b.*[\\\\/]bin$`))
        );
      });
    });

    describe('uses version of system Maven', () => {
      it.each([
        [' 3.8', '3.8.2', ''],
        ['3.x ', '3.3.9', TEST_VERSION]
      ])('%s -> %s', async (spec: string, expected: string, resolved: string) => {
        const resolvedVersion = await installer.setupMaven(spec, expected);

        expect(resolvedVersion).toBe(expected);
        expect(core.info).toHaveBeenCalledWith(
          expect.stringMatching(new RegExp(`Use.* ${expected} instead of .*\\b${resolved}`, 'i'))
        );
        expect(core.addPath).not.toHaveBeenCalled();
      });
    });

    it('install a new version of Maven', async () => {
      const expected = '3.6.3';
      mockHttpClientGet(createXmlManifest('3.5.2 ', ` ${expected}`, '3.6.1'));

      jest.spyOn(tc, 'downloadTool').mockResolvedValue('');
      jest.spyOn(tc, 'extractTar').mockResolvedValue('');
      const spyCache = jest.spyOn(tc, 'cacheDir').mockResolvedValue('foo');

      const resolvedVersion = await installer.setupMaven(' >3.5');

      expect(spyCache).toHaveBeenCalledWith(expect.stringContaining(expected), 'maven', expected);
      expect(resolvedVersion).toBe(expected);
      expect(core.addPath).toHaveBeenCalledWith(path.join('foo', 'bin'));
    });
  });
});
