#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const cliProgress = require('cli-progress');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Create a program instance
const program = new Command();

// Set up CLI options
program
  .name('pdf-shrinker')
  .description('A tool to compress PDF files using Ghostscript')
  .version('1.0.0')
  .requiredOption('-i, --input <file>', 'Input PDF file path')
  .option('-o, --output <file>', 'Output PDF file path (defaults to input-compressed.pdf)')
  .option('-l, --level <level>', 'Compression level (1-4, where 1 is lowest compression, 4 is highest)', '3')
  .option('-v, --verbose', 'Show detailed processing information')
  .helpOption('-h, --help', 'Display help information');

// Parse arguments
program.parse(process.argv);
const options = program.opts();

// Validate options
async function validateOptions(options) {
  // Check if input file exists
  if (!fs.existsSync(options.input)) {
    throw new Error(`Input file not found: ${options.input}`);
  }

  // Check if input file is a PDF
  if (!options.input.toLowerCase().endsWith('.pdf')) {
    throw new Error('Input file must be a PDF');
  }

  // Set default output file if not provided
  if (!options.output) {
    const inputPath = path.parse(options.input);
    options.output = path.join(inputPath.dir, `${inputPath.name}-compressed.pdf`);
    console.log(chalk.yellow(`No output specified, using: ${options.output}`));
  }

  // Validate compression level
  const level = parseInt(options.level);
  if (isNaN(level) || level < 1 || level > 5) {
    throw new Error('Compression level must be between 1 and 5');
  }
  options.level = level;

  return options;
}

// Main function to compress PDF
async function compressPdf(options) {
  try {
    const { input, output, level, verbose } = await validateOptions(options);

    console.log(chalk.blue('Starting PDF compression...'));
    console.log(chalk.gray(`Input: ${input}`));
    console.log(chalk.gray(`Output: ${output}`));
    console.log(chalk.gray(`Compression level: ${level}`));

    // Get the input file size
    const inputStats = fs.statSync(input);
    const inputSizeBytes = inputStats.size;
    const inputSizeMB = (inputSizeBytes / 1024 / 1024).toFixed(2);
    console.log(chalk.gray(`Input file size: ${inputSizeMB} MB`));

    // Create a progress bar
    const progressBar = new cliProgress.SingleBar({
      format: 'Compressing |' + chalk.cyan('{bar}') + '| {percentage}% || {value}/{total}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    // Start the progress bar with an indeterminate state
    progressBar.start(100, 0);

    try {
      // Prepare Ghostscript options
      const gsOptions = getGsOptionsForLevel(level);

      // Add output file parameter with -sOutputFile format
      gsOptions.push(`-sOutputFile=${output}`);

      // Add input file as the last parameter
      gsOptions.push(input);

      if (verbose) {
        console.log(chalk.gray('Ghostscript command:'), 'gs', gsOptions.join(' '));
      }

      // Execute Ghostscript using child_process.spawn
      return new Promise((resolve, reject) => {
        // Execute Ghostscript
        const gsProcess = spawn('gs', gsOptions);

        let stdoutData = '';
        let stderrData = '';

        // Update progress periodically as Ghostscript works
        const progressUpdater = setInterval(() => {
          const progress = Math.min(progressBar.value + 5, 99);
          progressBar.update(progress);
        }, 200);

        // Capture stdout data
        gsProcess.stdout.on('data', (data) => {
          stdoutData += data.toString();
          if (verbose) {
            console.log(chalk.gray(`GS stdout: ${data.toString().trim()}`));
          }
        });

        // Capture stderr data
        gsProcess.stderr.on('data', (data) => {
          stderrData += data.toString();
          if (verbose) {
            console.log(chalk.yellow(`GS stderr: ${data.toString().trim()}`));
          }
        });

        // Handle process completion
        gsProcess.on('close', (code) => {
          clearInterval(progressUpdater);

          if (code === 0) {
            // Update progress bar to completion and stop it
            progressBar.update(100);
            progressBar.stop();

            // Get the output file size and calculate compression ratio
            if (fs.existsSync(output)) {
              const outputStats = fs.statSync(output);
              const outputSizeBytes = outputStats.size;
              const outputSizeMB = (outputSizeBytes / 1024 / 1024).toFixed(2);
              const compressionRatio = (inputSizeBytes / outputSizeBytes).toFixed(2);
              const spaceSaved = ((1 - outputSizeBytes / inputSizeBytes) * 100).toFixed(1);

              console.log(chalk.green('\nPDF compression completed successfully!'));
              console.log(chalk.gray(`Output file size: ${outputSizeMB} MB`));
              console.log(chalk.blue(`Compression ratio: ${compressionRatio}x (${spaceSaved}% smaller)`));
              resolve();
            } else {
              reject(new Error('Output file was not created despite successful Ghostscript execution'));
            }
          } else {
            progressBar.stop();
            reject(new Error(`Ghostscript exited with code ${code}: ${stderrData}`));
          }
        });

        // Handle process errors
        gsProcess.on('error', (err) => {
          clearInterval(progressUpdater);
          progressBar.stop();

          if (err.code === 'ENOENT') {
            reject(new Error('Ghostscript (gs) executable not found. Please make sure Ghostscript is installed on your system.'));
          } else {
            reject(new Error(`Failed to start Ghostscript process: ${err.message}`));
          }
        });
      });
    } catch (gsError) {
      // Stop the progress bar in case of error
      progressBar.stop();
      throw new Error(`Ghostscript compression failed: ${gsError.message}`);
    }
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    if (options.verbose) {
      console.error(chalk.red(error.stack));
    }
    process.exit(1);
  }
}

// Helper function to get Ghostscript options based on compression level
function getGsOptionsForLevel(level) {
  // Common options for all compression levels
  const baseOptions = [
    '-sDEVICE=pdfwrite',
    '-dNOPAUSE',
    '-dQUIET',
    '-dBATCH',
    '-dSAFER'
  ];

  // Adjust settings based on compression level
  switch (level) {
    case 1: // Level 1: Light compression, highest quality
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
        '-dJPEGQ=95'  // High quality JPEG
      ];

    case 2: // Level 2: Medium compression, good quality
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
        '-dJPEGQ=85'  // Good quality JPEG
      ];

      case 3: // Level 3: Medium compression, reduced quality (default)
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
          '-dJPEGQ=80'  // Standard quality JPEG
        ];

    case 4: // Level 3: High compression, reduced quality (default)
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
        '-dJPEGQ=75'  // Standard quality JPEG
      ];

    case 5: // Level 4: Maximum compression, lowest quality
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
        '-dJPEGQ=50',  // Low quality JPEG
        '-dEmbedAllFonts=false',
        '-dSubsetFonts=true',
        '-dCompressFonts=true',
        '-dConvertCMYKImagesToRGB=true',
        '-dDetectDuplicateImages=true',
        '-dOptimize=true'
      ];

    default:
      // Default to level 3 if an invalid level is provided
      return getGsOptionsForLevel(3);
  }
}

// Execute the main function
compressPdf(options);
