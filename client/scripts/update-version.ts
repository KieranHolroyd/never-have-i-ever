/// <reference types="bun-types" />
import { spawnSync } from 'bun';
import path from 'node:path';
import type { PackageJson } from 'type-fest';

const pkg = await Bun.file('./package.json').json<PackageJson>();
const filePath = path.join('./src/lib/version.ts');

const version = pkg.version;
// write version to file
// prettier-ignore
await Bun.write(filePath, `/// GENERATED BY ./scripts/update-commit.ts\nexport const version = '${version}';`);

if (Bun.argv.includes('--commit') || Bun.argv.includes('-c')) {
	// commit version file to git with message
	const commit_file = spawnSync(['git', 'add', filePath]);
	const commit = spawnSync(['git', 'commit', '-m', `chore: update version to ${version}`]);
	const push = spawnSync(['git', 'push']);

	console.log(commit_file.stdout.toString(), commit.stdout.toString(), push.stdout.toString());
	console.log('Version updated to', version);
} else {
	console.log('Version updated to', version);
	console.log('Use --commit or -c to commit to git');
}