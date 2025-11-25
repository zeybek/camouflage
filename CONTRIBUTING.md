# Contributing to Camouflage

First off, thanks for taking the time to contribute! ❤️

Camouflage is a VS Code extension that helps protect sensitive values in configuration files by hiding them visually. It supports multiple formats including `.env`, `.json`, `.yaml`, `.properties`, `.toml`, and `.sh` files. Your contributions help make this tool better for everyone who wants to safely share their screen or take screenshots without exposing sensitive information.

All types of contributions are encouraged and valued. See the [Table of Contents](#table-of-contents) for different ways to help and details about how this project handles them. Please make sure to read the relevant section before making your contribution. It will make it a lot easier for us maintainers and smooth out the experience for all involved. The community looks forward to your contributions. 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [I Have a Question](#i-have-a-question)
- [I Want To Contribute](#i-want-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
  - [Pull Requests](#pull-requests)
- [Development Environment](#development-environment)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Testing Your Changes](#testing-your-changes)
- [Styleguides](#styleguides)
  - [Commit Messages](#commit-messages)
  - [TypeScript Styleguide](#typescript-styleguide)
  - [Documentation Styleguide](#documentation-styleguide)
- [Project Structure](#project-structure)
- [Release Process](#release-process)

## Code of Conduct

This project and everyone participating in it is governed by the
[Camouflage Code of Conduct](CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code.

## I Have a Question

> If you want to ask a question, we assume that you have read the available [Documentation](https://github.com/zeybek/camouflage).

Before you ask a question, it is best to search for existing [Issues](https://github.com/zeybek/camouflage/issues) that might help you. In case you have found a suitable issue and still need clarification, you can write your question in this issue.

If you still feel the need to ask a question and need clarification, we recommend the following:

- Open an [Issue](https://github.com/zeybek/camouflage/issues/new).
- Provide as much context as you can about what you're running into.
- Provide project and platform versions (VS Code, Node.js, npm, etc), depending on what seems relevant.

We will then take care of the issue as soon as possible.

## I Want To Contribute

### Reporting Bugs

#### Before Submitting a Bug Report

A good bug report shouldn't leave others needing to chase you up for more information. Therefore, we ask you to investigate carefully, collect information and describe the issue in detail in your report. Please complete the following steps in advance to help us fix any potential bug as fast as possible.

- Make sure that you are using the latest version of Camouflage.
- Determine if your bug is really a bug and not an error on your side e.g. using incompatible VS Code version.
- To see if other users have experienced (and potentially already solved) the same issue you are having, check if there is not already a bug report existing for your bug or error in the [bug tracker](https://github.com/zeybek/camouflage/issues?q=label%3Abug).
- Collect information about the bug:
  - VS Code version
  - Camouflage extension version
  - OS, Platform and Version (Windows, Linux, macOS, x86, ARM)
  - Steps to reproduce the issue
  - Expected behavior vs. actual behavior
  - Screenshots if applicable
  - Can you reliably reproduce the issue? And can you also reproduce it with older versions?

#### How Do I Submit a Good Bug Report?

> You must use the [Bug Report template](https://github.com/zeybek/camouflage/issues/new?template=bug_report.yml) when creating a new issue.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for Camouflage, including completely new features and minor improvements to existing functionality.

#### Before Submitting an Enhancement

- Make sure that you are using the latest version.
- Read the [documentation](https://github.com/zeybek/camouflage) carefully and find out if the functionality is already covered, maybe by an individual configuration.
- Perform a [search](https://github.com/zeybek/camouflage/issues) to see if the enhancement has already been suggested. If it has, add a comment to the existing issue instead of opening a new one.

#### How Do I Submit a Good Enhancement Suggestion?

> You must use the [Feature Request template](https://github.com/zeybek/camouflage/issues/new?template=feature_request.yml) when creating a new enhancement suggestion.

Enhancement suggestions are tracked as [GitHub issues](https://github.com/zeybek/camouflage/issues). After you've determined that your suggestion is not already reported, please create an issue and provide the following information:

- Use a clear and descriptive title for the issue to identify the suggestion.
- Provide a step-by-step description of the suggested enhancement in as many details as possible.
- Provide specific examples to demonstrate the steps. Include copy/pasteable snippets which you use in those examples, as Markdown code blocks.
- Describe the current behavior and explain which behavior you expected to see instead and why.
- Include screenshots or animated GIFs which help you demonstrate the steps or point out the part of Camouflage which the suggestion is related to.
- Explain why this enhancement would be useful to most Camouflage users.
- Specify which version of Camouflage you're using.
- Specify the VS Code version you're using.

### Your First Code Contribution

Unsure where to begin contributing to Camouflage? You can start by looking through these `beginner` and `help-wanted` issues:

- [Beginner issues](https://github.com/zeybek/camouflage/issues?q=label%3A%22good+first+issue%22) - issues which should only require a few lines of code, and a test or two.
- [Help wanted issues](https://github.com/zeybek/camouflage/issues?q=label%3A%22help+wanted%22) - issues which should be a bit more involved than beginner issues.

### Pull Requests

The process described here has several goals:

- Maintain Camouflage's quality
- Fix problems that are important to users
- Engage the community in working toward the best possible Camouflage
- Enable a sustainable system for Camouflage's maintainers to review contributions

Please follow these steps to have your contribution considered by the maintainers:

1. Follow all instructions in [the template](PULL_REQUEST_TEMPLATE/pull_request_template.md)
2. Follow the [styleguides](#styleguides)
3. After you submit your pull request, verify that all [status checks](https://help.github.com/articles/about-status-checks/) are passing
4. Wait for review and address any changes requested by the reviewers

While the prerequisites above must be satisfied prior to having your pull request reviewed, the reviewer(s) may ask you to complete additional design work, tests, or other changes before your pull request can be ultimately accepted.

## Development Environment

### Prerequisites

- [Node.js](https://nodejs.org/) (version 22 or higher)
- [VS Code](https://code.visualstudio.com/) (version 1.96.0 or higher)
- [Git](https://git-scm.com/)

### Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/camouflage.git
   cd camouflage
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up the development environment:
   ```bash
   npm run prepare
   ```

### Testing Your Changes

1. Press `F5` in VS Code to launch a new window with your extension loaded
2. Open files from the `examples/` directory to test different formats:
   - `sample.env`, `.env.local`, `.env.development` - Environment files
   - `config.json` - JSON with nested keys
   - `config.yaml`, `config.yml` - YAML with nested keys
   - `app.properties`, `settings.ini`, `app.conf` - Properties formats
   - `config.toml` - TOML with sections
   - `script.sh` - Shell scripts with exports
3. Make changes to the code and reload the VS Code window to see the effects:
   - Press `Ctrl+R` (Windows/Linux) or `Cmd+R` (Mac) to reload the window

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Styleguides

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

- Use the present tense ("add feature" not "added feature")
- Use the imperative mood ("move cursor to..." not "moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line
- Use the following prefixes:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `style:` for formatting changes
  - `refactor:` for code refactoring
  - `test:` for adding tests
  - `chore:` for maintenance tasks

### TypeScript Styleguide

- Use 2 spaces for indentation
- Use camelCase for variables, properties and function names
- Use PascalCase for class names and interfaces
- Use interface over type when possible
- End files with a newline
- Follow the conventions you see used in the source already
- Use ESLint and Prettier for code formatting:
  ```bash
  npm run lint
  npm run format
  ```

### Documentation Styleguide

- Use [Markdown](https://guides.github.com/features/mastering-markdown/) for documentation
- Reference methods and classes in markdown with the custom syntax:
  - Class: `{ClassName}`
  - Method: `{ClassName.methodName}`
- Use code blocks with the appropriate language syntax highlighting

## Project Structure

The project is structured as follows:

- `src/`: Source code
  - `core/`: Core functionality (Camouflage class, types)
  - `decorators/`: Method decorators (debounce, error handling, logging)
  - `parsers/`: Multi-format parsers
    - `base-parser.ts`: Abstract base class for parsers
    - `env-parser.ts`: Parser for .env, .envrc, .sh files
    - `json-parser.ts`: Parser for .json files (with nested key support)
    - `yaml-parser.ts`: Parser for .yaml, .yml files (with nested key support)
    - `properties-parser.ts`: Parser for .properties, .ini, .conf files
    - `toml-parser.ts`: Parser for .toml files
    - `index.ts`: Parser registry and factory
  - `lib/`: Utility libraries (text generator)
  - `utils/`: Helper functions (config, file, pattern-matcher)
  - `extension.ts`: Main extension entry point
- `examples/`: Example configuration files for testing
- `.github/`: GitHub-specific files
  - `ISSUE_TEMPLATE/`: Issue templates
  - `PULL_REQUEST_TEMPLATE/`: PR templates
  - `workflows/`: GitHub Actions workflows
- `.cursor/rules/`: AI assistant guidelines and project documentation
- `assets/`: Icons and images
- `images/`: Screenshots and documentation images

## Release Process

Camouflage uses [semantic-release](https://semantic-release.gitbook.io/semantic-release/) for automated releases. The release process is triggered automatically when changes are merged into the main branch.

1. Commits to the main branch trigger the release workflow
2. The workflow determines the next version number based on commit messages
3. A new release is created with release notes generated from commit messages
4. The extension is published to the VS Code Marketplace

Thank you for contributing to Camouflage! 🎭
