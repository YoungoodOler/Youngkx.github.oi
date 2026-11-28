import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { friendLinksRevision, validateUsefulLinksPayload } from '../lib/useful-links-schema.ts';

const snapshotPath = new URL('../content/friend-links.json', import.meta.url);
const expectedAt = process.env.LINKS_UPDATED_AT;
const expectedRevision = expectedAt ? friendLinksRevision(expectedAt) : -Infinity;
if (expectedAt && !Number.isFinite(expectedRevision)) {
  throw new Error('Invalid friend links revision requested by the workflow.');
}

function validatedSnapshot(value) {
  const validation = validateUsefulLinksPayload(value);
  if (!validation.ok) throw new Error(validation.error);
  if (
    validation.data.updatedAt !== null &&
    !Number.isFinite(friendLinksRevision(validation.data.updatedAt))
  ) {
    throw new Error('Invalid friend links timestamp.');
  }
  return validation.data;
}

const local = await readFile(snapshotPath, 'utf8')
  .then((value) => validatedSnapshot(JSON.parse(value)))
  .catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
const localRevision = friendLinksRevision(local?.updatedAt ?? null);
let deployedAt;
let latest;

for (let attempt = 0; attempt < 8; attempt += 1) {
  const response = await fetch('https://www.youngkx.cn/api/links', {
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Friend links API returned HTTP ${response.status}.`);

  deployedAt = response.headers.get('x-friend-links-snapshot');
  const cloud = validatedSnapshot(await response.json());
  const cloudRevision = friendLinksRevision(cloud.updatedAt);
  latest = !local || cloudRevision > localRevision ? cloud : local;
  if (friendLinksRevision(latest.updatedAt) >= expectedRevision) break;

  if (attempt === 7) throw new Error('The saved revision has not reached the public API yet.');
  await delay(10_000);
}

if (latest !== local) {
  if (!latest.updatedAt) throw new Error('No saved cloud snapshot is available.');
  await writeFile(snapshotPath, `${JSON.stringify(latest, null, 2)}\n`);
  console.log(`Updated the source snapshot to ${latest.updatedAt}.`);
}

if (process.env.GITHUB_OUTPUT) {
  const shouldDeploy = Boolean(latest.updatedAt && latest.updatedAt !== deployedAt);
  await appendFile(process.env.GITHUB_OUTPUT, `deploy=${shouldDeploy}\n`);
}
