import * as core from '@actions/core';
import * as installer from './installer';

async function run() {
  try {
    let version = core.getInput('maven-version');
    let mirror = core.getInput('maven-mirror');
    if (version) {
      await installer.getMaven(version, mirror || "");
    }
  } catch (error) {
    core.setFailed((error as Error).message);
  }
}

run();
