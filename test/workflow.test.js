import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const updateDependenciesWorkflow = readFileSync(
  new URL('../.github/workflows/update-dependencies.yml', import.meta.url),
  'utf8',
);
const ciWorkflow = readFileSync(
  new URL('../.github/workflows/ci.yml', import.meta.url),
  'utf8',
);

const createPullRequestAction = /uses:\s+peter-evans\/create-pull-request@v8/;
const deprecatedBodyFileInput = /(^|\n)\s+body-file:/;
const bodyPathInput = /(^|\n)\s+body-path:\s+ncu-report\.txt/;
const masterPushBranch = /(^|\n)\s+-\s+master(\r?\n|$)/;

test('dependency update workflow uses create-pull-request v8 body input', () => {
  assert.match(updateDependenciesWorkflow, createPullRequestAction);
  assert.doesNotMatch(updateDependenciesWorkflow, deprecatedBodyFileInput);
  assert.match(updateDependenciesWorkflow, bodyPathInput);
});

test('CI workflow runs on pushes to master', () => {
  assert.match(ciWorkflow, masterPushBranch);
});
