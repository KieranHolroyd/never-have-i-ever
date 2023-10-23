/// <reference types="bun-types" />
import { spawnSync } from 'bun';
import path from 'node:path';
import type { PackageJson } from 'type-fest';

const pkg = await Bun.file('./package.json').json<PackageJson>();
const filePath = path.join('./src/lib/version.ts');

const version = pkg.version;
// write version to file
await Bun.write(filePath, `export const version = '${version}';`);

// commit version file to git with message
const commit_file = spawnSync(['git', 'add', filePath]);
const commit = spawnSync(['git', 'commit', '-m', `chore: update version to ${version}`]);
const push = spawnSync(['git', 'push']);

console.log(commit_file.stdout.toString(), commit.stdout.toString(), push.stdout.toString());
console.log('Version updated to', version);
