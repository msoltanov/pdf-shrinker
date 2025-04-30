import { test, after } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs, { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cliPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'index.js',
);
const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url)),
);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-shrinker-test-'));
const dummyPdfPath = path.join(tempDir, 'dummy.pdf');
fs.writeFileSync(dummyPdfPath, '%PDF-1.4\n');

after(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], { encoding: 'utf8' });
}

function ghostscriptBinary() {
  const candidates =
    process.platform === 'win32' ? ['gswin64c', 'gswin32c'] : ['gs'];
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['--version'], { stdio: 'ignore' });
    if (result.status === 0) {
      return candidate;
    }
  }
  return null;
}

test('--help exits 0 and shows usage', () => {
  const result = runCli(['--help']);
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Usage/);
});

test('--version matches package.json version', () => {
  const result = runCli(['--version']);
  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout.trim(), packageJson.version);
});

test('missing input file fails with a clear error', () => {
  const result = runCli(['-i', path.join(tempDir, 'missing.pdf')]);
  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /Input file not found/);
});

test('non-pdf input is rejected', () => {
  const textFilePath = path.join(tempDir, 'notes.txt');
  fs.writeFileSync(textFilePath, 'not a pdf');
  const result = runCli(['-i', textFilePath]);
  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /must be a PDF/);
});

test('compression level outside 1-5 is rejected', () => {
  const result = runCli([
    '-i',
    dummyPdfPath,
    '-o',
    path.join(tempDir, 'out.pdf'),
    '-l',
    '9',
  ]);
  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /must be an integer between 1 and 5/);
});

test('fractional compression level is rejected', () => {
  const result = runCli([
    '-i',
    dummyPdfPath,
    '-o',
    path.join(tempDir, 'out.pdf'),
    '-l',
    '3.5',
  ]);
  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /must be an integer between 1 and 5/);
});

test('identical input and output paths are rejected', () => {
  const result = runCli(['-i', dummyPdfPath, '-o', dummyPdfPath]);
  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /must be different/);
});

test('missing output directory fails', () => {
  const outputInMissingDir = path.join(tempDir, 'no-such-dir', 'out.pdf');
  const result = runCli(['-i', dummyPdfPath, '-o', outputInMissingDir]);
  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /Output directory does not exist/);
});

test('warns when an existing output file will be overwritten', () => {
  const existingOutput = path.join(tempDir, 'existing.pdf');
  fs.writeFileSync(existingOutput, 'old content');
  const result = runCli(['-i', dummyPdfPath, '-o', existingOutput]);
  assert.match(result.stdout, /Warning: overwriting existing file/);
});

test('without Ghostscript the CLI reports a clean error', () => {
  if (ghostscriptBinary()) {
    return;
  }
  const result = runCli([
    '-i',
    dummyPdfPath,
    '-o',
    path.join(tempDir, 'out.pdf'),
  ]);
  assert.strictEqual(result.status, 1);
  assert.doesNotMatch(result.stderr, /UnhandledPromiseRejection/);
  assert.match(result.stderr, /Ghostscript executable not found/);
});

test('compresses a small PDF when Ghostscript is available', () => {
  const binary = ghostscriptBinary();
  if (!binary) {
    return;
  }
  const inputPath = buildMinimalPdf(path.join(tempDir, 'minimal.pdf'));
  const outputPath = path.join(tempDir, 'minimal-compressed.pdf');
  const result = runCli(['-i', inputPath, '-o', outputPath]);
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /completed/);
  assert.ok(fs.existsSync(outputPath));
  assert.ok(fs.statSync(outputPath).size > 0);
});

test('verbose mode shows the Ghostscript output', () => {
  const binary = ghostscriptBinary();
  if (!binary) {
    return;
  }
  const inputPath = buildMinimalPdf(path.join(tempDir, 'verbose.pdf'));
  const outputPath = path.join(tempDir, 'verbose-compressed.pdf');
  const result = runCli(['-i', inputPath, '-o', outputPath, '-v']);
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /GS stdout:/);
});

test('warns when the output is not smaller than the input', () => {
  const binary = ghostscriptBinary();
  if (!binary) {
    return;
  }
  const inputPath = buildMinimalPdf(path.join(tempDir, 'tiny.pdf'));
  const outputPath = path.join(tempDir, 'tiny-compressed.pdf');
  const result = runCli(['-i', inputPath, '-o', outputPath]);
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /output file is not smaller than the input/);
});

function buildMinimalPdf(targetPath) {
  const stream = '1 0 0 rg 72 700 200 100 re f 0 0 1 rg 90 680 160 40 re f';
  const pageDict =
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ' +
    '/Contents 4 0 R /Resources << >> >>';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    pageDict,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  fs.writeFileSync(targetPath, Buffer.from(pdf, 'latin1'));
  return targetPath;
}
