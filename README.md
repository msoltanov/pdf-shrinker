# PDF-Shrinker

A command-line tool that compresses PDF files with Ghostscript.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

PDF-Shrinker is a Node.js command-line tool that runs Ghostscript to compress PDF files. You choose one of five compression levels to balance file size against output quality.

## Features

- Five compression levels, from light to maximum
- Progress indicator with elapsed time
- File size statistics for the input and output files
- Verbose mode that shows the Ghostscript command and its output

## Prerequisites

- Node.js version 22.12 or later
- Ghostscript. The tool must find it in your PATH.

## Installation

### Install from source

```bash
git clone https://github.com/msoltanov/pdf-shrinker.git
cd pdf-shrinker
npm install

# Make the script executable
chmod +x index.js

# Optional. Makes the pdf-shrinker command available in your PATH.
npm link
```

### Verify Ghostscript

Run:

```bash
gs --version
```

On Windows, run `gswin64c --version` instead.

If you do not have Ghostscript, install it with one of these commands:

- Ubuntu/Debian: `sudo apt-get install ghostscript`
- macOS: `brew install ghostscript`
- Windows: Download the installer from the [Ghostscript website](https://www.ghostscript.com/download/gsdnld.html)

## Usage

From any folder, run:

```bash
pdf-shrinker -i input.pdf -o output.pdf
```

From a local clone, run:

```bash
./index.js -i input.pdf -o output.pdf
```

### Options

| Option | Description |
|--------|-------------|
| `-i, --input <file>` | Input PDF file. Required. |
| `-o, --output <file>` | Output PDF file. Optional. Default: `<input>-compressed.pdf` |
| `-l, --level <1-5>` | Compression level. Optional. Default: 3 |
| `-v, --verbose` | Show the Ghostscript command and its output |
| `-V, --version` | Show the version number |
| `-h, --help` | Show help |

### Compression levels

Level 3 is the default. Level 1 keeps the highest quality, and level 5 produces the smallest file.

| Level | Quality | Best for |
|-------|---------|----------|
| 1 | Highest | Print files with high-resolution images |
| 2 | High | General documents |
| 3 | Medium | Files for email or limited storage |
| 4 | Lower | Email when size matters more than quality |
| 5 | Lowest | Archives where file size matters most |

## Examples

```bash
# Default level (3)
pdf-shrinker -i large-document.pdf -o compressed-document.pdf

# Level 1, highest quality
pdf-shrinker -i large-document.pdf -o high-quality.pdf -l 1

# Level 5, smallest file
pdf-shrinker -i large-document.pdf -o max-compressed.pdf -l 5

# Debug output
pdf-shrinker -i large-document.pdf -o out.pdf -v
```

## Performance results

Approximate file size reduction from tests:

| Level | Reduction |
|-------|-----------|
| 1 | 20-40% |
| 2 | 40-60% |
| 3 | 60-70% |
| 4 | 70-80% |
| 5 | 80-95% |

Your results depend on the content of the PDF file.

## Troubleshooting

Read the error message, then apply the matching fix:

| Error | Fix |
|-------|-----|
| `Input file not found: <path>` | Check the file path. |
| `Input file must be a PDF` | Give a file with the `.pdf` extension. |
| `Compression level must be an integer between 1 and 5` | Pass a whole number from 1 to 5 to `-l`. |
| `Input and output files must be different paths` | Set `-o` to a different file. |
| `Output directory does not exist: <path>` | Create the directory first. |
| `Ghostscript executable not found` | Install Ghostscript and add it to your PATH. On Windows the tool looks for `gswin64c` and then `gswin32c`. |
| Permission denied | Make the script executable with `chmod +x index.js`. |
| `Warning: the output file is not smaller than the input file` | Try a higher compression level, or keep the original file. |

If a compression fails, run it again with `-v` to see the Ghostscript command and its output.

## Security

CAUTION: Only compress PDF files from a source you trust.

Ghostscript runs with the `-dSAFER` flag, which blocks many unsafe PostScript operations. `-dSAFER` is not a complete sandbox. In the past, Ghostscript had sandbox-bypass vulnerabilities.

Keep Ghostscript at its latest version to get security fixes.

## License

Released under the MIT License. See the LICENSE file.

## Contributing

Pull requests are welcome. Run `npm test` and `npm run lint` before you open a pull request. Add an entry to `CHANGELOG.md` for a user-facing change.
