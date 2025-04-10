# PDF-Shrinker

A command-line tool to compress PDF files while maintaining reasonable quality.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

PDF-Shrinker is a Node.js command-line utility that leverages Ghostscript to compress PDF files efficiently. It offers multiple compression levels, allowing you to balance file size reduction with output quality based on your specific needs.

## Features

- 🗜️ Multiple compression levels (from light to maximum)
- 📊 Real-time progress tracking
- 📏 Detailed compression statistics (before/after sizes, ratio)  
- 🎮 Simple command-line interface
- 🚀 Fast processing
- 📝 Verbose mode for debugging

## Prerequisites

- Node.js (version 12 or later)
- Ghostscript (must be installed and available in your PATH)

## Installation

### Local Installation

```bash
# Clone the repository
git clone https://github.com/msoltanov/pdf-shrinker.git
cd pdf-shrinker

# Install dependencies
npm install

# Make the script executable
chmod +x index.js
```

### Manual Package Installation (Offline)

For offline/manual installation, download the following .tgz packages from the npm registry:

1. Download these packages from npmjs.com:
   - https://registry.npmjs.org/chalk/-/chalk-4.1.2.tgz
   - https://registry.npmjs.org/cli-progress/-/cli-progress-3.12.0.tgz
   - https://registry.npmjs.org/commander/-/commander-13.1.0.tgz

2. Copy the downloaded .tgz files to your project directory

3. Install each package manually:
```bash
npm install ./chalk-4.1.2.tgz
npm install ./cli-progress-3.12.0.tgz
npm install ./commander-13.1.0.tgz
```

Note: Some packages might have dependencies that need to be installed separately. Check package.json inside each .tgz file for required dependencies.

### Verify Ghostscript Installation

Ensure Ghostscript is installed by running:

```bash
gs --version
```

If not installed, you can install it using:

- **Ubuntu/Debian**: `sudo apt-get install ghostscript`
- **macOS**: `brew install ghostscript`
- **Windows**: Download from [Ghostscript website](https://www.ghostscript.com/download/gsdnld.html)

## Usage

### Basic Usage

```bash
pdf-shrinker -i input.pdf -o output.pdf
```

If installed locally, run:

```bash
./index.js -i input.pdf -o output.pdf
```

### Command Line Options

| Option | Description |
|--------|-------------|
| `-i, --input <file>` | Input PDF file (required) |
| `-o, --output <file>` | Output PDF file (optional, defaults to input-compressed.pdf) |
| `-l, --level <1-5>` | Compression level (optional, defaults to 3) |
| `-v, --verbose` | Show detailed processing information |
| `-h, --help` | Display help information |

### Compression Levels

PDF-Shrinker offers four compression levels:

#### Level 1: Light Compression
- Best quality output
- Minimal file size reduction
- Ideal for: Documents with many high-quality images that must remain high-resolution

#### Level 2: Lower Compression
- Good quality output
- Moderate file size reduction
- Ideal for: General purpose documents with mixed content

#### Level 3: Medium Compression (default)
- Average quality but still acceptable for most purposes
- Significant file size reduction
- Ideal for: Documents that need to be emailed or stored with limited space

#### Level 4: Higher Compression
- Reduced quality but still acceptable for most purposes
- Significant file size reduction
- Ideal for: Documents that need to be emailed or stored with limited space

#### Level 5: Maximum Compression
- Lowest quality
- Maximum file size reduction
- Ideal for: Archiving, when file size is critical and some quality loss is acceptable

## Examples

### Basic Compression (Level 3)

```bash
pdf-shrinker -i large-document.pdf -o compressed-document.pdf
```

### Light Compression with Highest Quality (Level 1)

```bash
pdf-shrinker -i large-document.pdf -o high-quality-compressed.pdf -l 1
```

### Maximum Compression with Lowest Quality (Level 5)

```bash
pdf-shrinker -i large-document.pdf -o max-compressed.pdf -l 5
```

### Verbose Mode for Debugging

```bash
pdf-shrinker -i large-document.pdf -o compressed-document.pdf -v
```

## Performance Results

Based on testing, you can expect approximately:

- **Level 1**: 20-40% reduction in file size
- **Level 2**: 40-60% reduction in file size
- **Level 3**: 60-70% reduction in file size
- **Level 4**: 70-80% reduction in file size
- **Level 5**: 80-95% reduction in file size

Actual results may vary depending on the content of your PDF files.

## Troubleshooting

### Common Issues

- **"Command not found"**: Ensure the tool is installed globally or you're running from the correct directory
- **"Ghostscript not found"**: Make sure Ghostscript is installed and added to your PATH
- **"Permission denied"**: Make sure the script is executable (`chmod +x index.js`)
- **"Error: Input file not found"**: Check that the input file path is correct

### Getting Help

If you encounter any issues, please:

1. Run in verbose mode (`-v`) to see detailed information
2. Check that Ghostscript is properly installed
3. Ensure you have read/write permissions for the input and output locations

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
