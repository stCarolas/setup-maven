import * as installer from '../src/installer';

describe('getAvailableVersions', () => {
  it('load real available versions', async () => {
    const availableVersions = await installer.getAvailableVersions();

    expect(availableVersions).toBeTruthy();
    expect(availableVersions).toEqual(expect.arrayContaining(['3.2.5', '3.3.3', '3.8.2']));
  });
});
