/* eslint @typescript-eslint/consistent-type-imports: 0 */
import * as os from 'os';
import * as path from 'path';
import { IncomingMessage } from 'http';

import * as core from '@actions/core';
import { HttpClient, HttpCodes } from '@actions/http-client';

import * as installer from '../src/installer';

// Mocking modules
jest.mock('@actions/core');

const CACHE_PATH = path.join(__dirname, 'runner');

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
    jest.spyOn(HttpClient.prototype, 'get').mockResolvedValue({
      message: ({ statusCode: 0 } as unknown) as IncomingMessage,
      readBody: jest.fn().mockResolvedValue('')
    });

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
      jest.spyOn(HttpClient.prototype, 'get').mockResolvedValue({
        message: ({ statusCode: HttpCodes.OK } as unknown) as IncomingMessage,
        readBody: jest.fn().mockResolvedValue(xml)
      });

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
      jest.spyOn(HttpClient.prototype, 'get').mockResolvedValue({
        message: ({ statusCode: HttpCodes.OK } as unknown) as IncomingMessage,
        readBody: jest.fn().mockResolvedValue(createXmlManifest(...versions))
      });

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
      jest.spyOn(HttpClient.prototype, 'get').mockResolvedValue({
        message: ({ statusCode: HttpCodes.OK } as unknown) as IncomingMessage,
        readBody: jest.fn().mockResolvedValue(createXmlManifest(...versions))
      });

      const resolvedVersion = await installer.findVersionForDownload(spec);
      expect(resolvedVersion).toBe(expected);
      expect(core.debug).toHaveBeenCalledWith(expect.stringMatching(/Resolved version/i));
    });
  });
});

process.env.RUNNER_TEMP = os.tmpdir();
process.env.RUNNER_TOOL_CACHE = CACHE_PATH;

describe('downloadMaven', () => {
  it.todo('download a real version of Maven');

  it.todo('raises error if download failed');

  it.todo('raises error when extracting failed');
});
