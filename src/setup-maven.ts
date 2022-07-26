import * as core from '@actions/core';

import * as installer from './installer';

async function run() {
  try {
    const version = core.getInput('maven-version');
    if (version) {
      await installer.getMaven(version);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

// noinspection JSIgnoredPromiseFromCall
run();
