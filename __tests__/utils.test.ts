import * as path from 'path';

import { getVersionFromToolcachePath } from '../src/utils';

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
