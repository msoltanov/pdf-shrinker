#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs, { readFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url)),
);

const spinnerFrames = ['|', '/', '-', '\\'];
const spinnerIntervalMs = 100;
const spinnerClearWidth = 80;
const windowsGhostscriptBinaries = ['gswin64c', 'gswin32c'];
const defaultGhostscriptBinary = 'gs';

const program = new Command();

program
  .name('pdf-shrinker')
  .description('A command-line tool that compresses PDF files with Ghostscript')
  .version(version)
  .requiredOption('-i, --input <file>', 'Input PDF file path')
  .option(
    '-o, --output <file>',
    'Output PDF file path (defaults to input-compressed.pdf)',
  )
  .option(
    '-l, --level <level>',
    'Compression level (1-5, where 1 is lowest compression, 5 is highest)',
    '3',
  )
  .option('-v, --verbose', 'Show the Ghostscript command and its output')
  .helpOption('-h, --help', 'Show help');

program.parse(process.argv);
const options = program.opts();

async function compressPdf(cliOptions) {
  const { input, output, level } = validateOptions(cliOptions);

  console.log(chalk.blue('Starting PDF compression'));
  console.log(chalk.gray(`Input: ${input}`));
  console.log(chalk.gray(`Output: ${output}`));
  console.log(chalk.gray(`Compression level: ${level}`));

  const inputSizeBytes = fs.statSync(input).size;
  console.log(chalk.gray(`Input file size: ${formatMb(inputSizeBytes)} MB`));

  const stopSpinner = startSpinner(chalk.cyan('Compressing'));
  try {
    const binary = await resolveGhostscriptBinary();

    // Ghostscript's own quiet flag would hide the output verbose mode shows.
    const quietOption = cliOptions.verbose ? [] : ['-dQUIET'];
    const gsOptions = [
      ...getGsOptionsForLevel(level),
      ...quietOption,
      `-sOutputFile=${output}`,
      input,
    ];

    if (cliOptions.verbose) {
      console.log(
        chalk.gray('Ghostscript command:'),
        binary,
        gsOptions.join(' '),
      );
    }

    await runGhostscript(binary, gsOptions, buildLogHandlers(cliOptions));
  } finally {
    stopSpinner();
  }

  if (!fs.existsSync(output)) {
    throw new Error(
      'Ghostscript reported success, but the output file was not created.',
    );
  }

  printCompressionStats(inputSizeBytes, output);
}

function validateOptions(options) {
  if (!fs.existsSync(options.input)) {
    throw new Error(`Input file not found: ${options.input}`);
  }

  if (!options.input.toLowerCase().endsWith('.pdf')) {
    throw new Error('Input file must be a PDF');
  }

  let output = options.output;
  if (!output) {
    const inputPath = path.parse(options.input);
    output = path.join(inputPath.dir, `${inputPath.name}-compressed.pdf`);
    console.log(chalk.yellow(`No output file specified. Using: ${output}`));
  }

  if (path.resolve(options.input) === path.resolve(output)) {
    throw new Error('Input and output files must be different paths');
  }

  const outputDir = path.dirname(path.resolve(output));
  if (!fs.existsSync(outputDir)) {
    throw new Error(`Output directory does not exist: ${outputDir}`);
  }

  const level = Number(options.level);
  if (!Number.isInteger(level) || level < 1 || level > 5) {
    throw new Error('Compression level must be an integer between 1 and 5');
  }

  if (fs.existsSync(output)) {
    console.log(chalk.yellow(`Warning: overwriting existing file: ${output}`));
  }

  return { output, level, input: options.input };
}

async function resolveGhostscriptBinary() {
  const candidates =
    process.platform === 'win32'
      ? windowsGhostscriptBinaries
      : [defaultGhostscriptBinary];

  for (const candidate of candidates) {
    const available = await new Promise((resolve) => {
      const probe = spawn(candidate, ['--version'], { stdio: 'ignore' });
      probe.on('error', () => resolve(false));
      probe.on('close', (code) => resolve(code === 0));
    });
    if (available) {
      return candidate;
    }
  }

  throw new Error(
    'Ghostscript executable not found. Install it and add it to your PATH.',
  );
}

function buildLogHandlers(cliOptions) {
  if (!cliOptions.verbose) {
    return {};
  }

  return {
    onStdout: (text) => console.log(chalk.gray(`GS stdout: ${text.trim()}`)),
    onStderr: (text) => console.log(chalk.yellow(`GS stderr: ${text.trim()}`)),
  };
}

function runGhostscript(binary, gsOptions, handlers) {
  return new Promise((resolve, reject) => {
    const gsProcess = spawn(binary, gsOptions);
    let stderrData = '';

    gsProcess.stdout.on('data', (data) => {
      if (handlers.onStdout) {
        handlers.onStdout(data.toString());
      }
    });

    gsProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
      if (handlers.onStderr) {
        handlers.onStderr(data.toString());
      }
    });

    gsProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Ghostscript exited with code ${code}: ${stderrData}`));
    });

    gsProcess.on('error', (err) => {
      reject(new Error(`Could not start Ghostscript: ${err.message}`));
    });
  });
}

function startSpinner(label) {
  if (!process.stdout.isTTY) {
    return () => {};
  }

  let frameIndex = 0;
  const startedAt = Date.now();

  const render = () => {
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    const frame = spinnerFrames[frameIndex % spinnerFrames.length];
    process.stdout.write(`\r${label} ${frame} ${elapsedSeconds}s`);
    frameIndex += 1;
  };

  render();
  const timer = setInterval(render, spinnerIntervalMs);

  return () => {
    clearInterval(timer);
    process.stdout.write(`\r${' '.repeat(spinnerClearWidth)}\r`);
  };
}

function formatMb(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

function printCompressionStats(inputSizeBytes, output) {
  const outputSizeBytes = fs.statSync(output).size;

  console.log(chalk.green('\nPDF compression completed.'));
  console.log(chalk.gray(`Output file size: ${formatMb(outputSizeBytes)} MB`));

  if (inputSizeBytes === 0 || outputSizeBytes === 0) {
    console.log(
      chalk.yellow('Warning: could not calculate compression ratio.'),
    );
    return;
  }

  if (outputSizeBytes >= inputSizeBytes) {
    console.log(
      chalk.yellow(
        `Warning: the output file is not smaller than the input file.
This can happen when the PDF is already optimized.
Try a higher compression level, or keep the original file.`,
      ),
    );
    return;
  }

  const compressionRatio = (inputSizeBytes / outputSizeBytes).toFixed(2);
  const spaceSaved = ((1 - outputSizeBytes / inputSizeBytes) * 100).toFixed(1);
  console.log(
    chalk.blue(
      `Compression ratio: ${compressionRatio}x (${spaceSaved}% smaller)`,
    ),
  );
}

function getGsOptionsForLevel(level) {
  const baseOptions = ['-sDEVICE=pdfwrite', '-dNOPAUSE', '-dBATCH', '-dSAFER'];

  switch (level) {
    case 1:
      return [
        ...baseOptions,
        '-dPDFSETTINGS=/prepress',
        '-dCompatibilityLevel=1.7',
        '-dColorImageResolution=300',
        '-dGrayImageResolution=300',
        '-dMonoImageResolution=300',
        '-dColorImageDownsampleType=/Bicubic',
        '-dGrayImageDownsampleType=/Bicubic',
        '-dMonoImageDownsampleType=/Bicubic',
        '-dAutoFilterColorImages=false',
        '-dAutoFilterGrayImages=false',
        '-dColorImageFilter=/DCTEncode',
        '-dGrayImageFilter=/DCTEncode',
        '-dJPEGQ=95',
      ];

    case 2:
      return [
        ...baseOptions,
        '-dPDFSETTINGS=/printer',
        '-dCompatibilityLevel=1.6',
        '-dColorImageResolution=150',
        '-dGrayImageResolution=150',
        '-dMonoImageResolution=200',
        '-dColorImageDownsampleType=/Bicubic',
        '-dGrayImageDownsampleType=/Bicubic',
        '-dMonoImageDownsampleType=/Bicubic',
        '-dAutoFilterColorImages=true',
        '-dAutoFilterGrayImages=true',
        '-dColorImageFilter=/DCTEncode',
        '-dGrayImageFilter=/DCTEncode',
        '-dJPEGQ=85',
      ];

    case 3:
      return [
        ...baseOptions,
        '-dPDFSETTINGS=/ebook',
        '-dCompatibilityLevel=1.5',
        '-dColorImageResolution=110',
        '-dGrayImageResolution=110',
        '-dMonoImageResolution=150',
        '-dColorImageDownsampleType=/Average',
        '-dGrayImageDownsampleType=/Average',
        '-dMonoImageDownsampleType=/Bicubic',
        '-dAutoFilterColorImages=true',
        '-dAutoFilterGrayImages=true',
        '-dColorImageFilter=/DCTEncode',
        '-dGrayImageFilter=/DCTEncode',
        '-dJPEGQ=80',
      ];

    case 4:
      return [
        ...baseOptions,
        '-dPDFSETTINGS=/ebook',
        '-dCompatibilityLevel=1.5',
        '-dColorImageResolution=96',
        '-dGrayImageResolution=96',
        '-dMonoImageResolution=150',
        '-dColorImageDownsampleType=/Average',
        '-dGrayImageDownsampleType=/Average',
        '-dMonoImageDownsampleType=/Subsample',
        '-dAutoFilterColorImages=true',
        '-dAutoFilterGrayImages=true',
        '-dColorImageFilter=/DCTEncode',
        '-dGrayImageFilter=/DCTEncode',
        '-dJPEGQ=75',
      ];

    case 5:
      return [
        ...baseOptions,
        '-dPDFSETTINGS=/screen',
        '-dCompatibilityLevel=1.4',
        '-dColorImageResolution=72',
        '-dGrayImageResolution=72',
        '-dMonoImageResolution=72',
        '-dColorImageDownsampleType=/Average',
        '-dGrayImageDownsampleType=/Average',
        '-dMonoImageDownsampleType=/Subsample',
        '-dAutoFilterColorImages=true',
        '-dAutoFilterGrayImages=true',
        '-dColorImageFilter=/DCTEncode',
        '-dGrayImageFilter=/DCTEncode',
        '-dJPEGQ=50',
        '-dEmbedAllFonts=false',
        '-dSubsetFonts=true',
        '-dCompressFonts=true',
        '-dConvertCMYKImagesToRGB=true',
        '-dDetectDuplicateImages=true',
        '-dOptimize=true',
      ];

    default:
      return getGsOptionsForLevel(3);
  }
}

compressPdf(options).catch((error) => {
  console.error(chalk.red(`Error: ${error.message}`));
  if (options.verbose && error.stack) {
    console.error(chalk.red(error.stack));
  }
  process.exitCode = 1;
});
