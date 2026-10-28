// Build-time helper only. Install espeak-ng@1.0.2 in a separate tools directory.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { default: ESpeakNg } = await import(pathToFileURL(process.argv[2]).href);
const engine = await ESpeakNg({ arguments: ['-v', 'fr-fr', '-s', '145', '-w', 'narration.wav', readFileSync(process.argv[3], 'utf8')] });
writeFileSync(process.argv[4], engine.FS.readFile('narration.wav'));
