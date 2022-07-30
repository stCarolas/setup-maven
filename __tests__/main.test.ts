import * as core from '@actions/core';

import { run } from '../src/main';

describe('failed to run with invalid inputs', () => {
  it.each([
    ['maven-version', { 'maven-version': ' foo-3!' }] // eslint-disable-line no-inline-comments
  ])('%s', async (name: string, inputs: Readonly<Record<string, string>>) => {
    const spyFailed = jest.spyOn(core, 'setFailed');
    jest.spyOn(core, 'getInput').mockImplementation((key: string) => inputs[key]);

    await run();
    expect(spyFailed).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`[Ii]nvalid .*'${inputs[name]}'`))
    );
  });
});
