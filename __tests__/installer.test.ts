import * as installer from '../src/installer';

describe('getAvailableVersions', () => {
  it('loads real available versions', async () => {
    const availableVersions = await installer.getAvailableVersions();

    expect(availableVersions).toStrictEqual(
      expect.arrayContaining(['3.0', '3.2.5', '3.3.3', '3.8.2'])
    );
  });
});
