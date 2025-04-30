# Changelog

All notable changes to this project are documented in this file.

This project follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.
Version numbers follow [Semantic Versioning](https://semver.org/).

## [0.0.1-beta.1]

### Added

- PDF compression with Ghostscript, at five compression levels.
- `-i`, `-o`, `-l`, and `-v` options for the input file, the output file, the compression level, and verbose mode.
- A progress spinner that shows the elapsed time during compression.
- File size statistics for the input and output files, with the compression ratio.
- A warning when the output file is not smaller than the input file.
- Clear error messages for a missing input file, a wrong file type, an invalid compression level, identical input and output paths, and a missing output directory.
