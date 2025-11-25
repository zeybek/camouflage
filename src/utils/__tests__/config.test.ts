import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as vscode from 'vscode';
import * as config from '../config';

// Mock the VS Code API
jest.mock(
  'vscode',
  () => {
    const mockConfig = {
      get: jest.fn(),
      update: jest.fn().mockImplementation(() => Promise.resolve()),
      has: jest.fn(() => true),
    };

    return {
      workspace: {
        getConfiguration: jest.fn().mockReturnValue(mockConfig),
      },
    };
  },
  { virtual: true }
);

describe('config utils', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockConfig = vscode.workspace.getConfiguration() as any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset default mock implementation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockConfig.get.mockImplementation((key: string, defaultValue: any) => defaultValue);
  });

  describe('getConfig', () => {
    it('should return configuration for camouflage section', () => {
      // Act
      const result = config.getConfig();

      // Assert
      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('camouflage');
      expect(result).toBe(mockConfig);
    });
  });

  describe('isEnabled', () => {
    it('should return true by default', () => {
      expect(config.isEnabled()).toBe(true);
      expect(mockConfig.get).toHaveBeenCalledWith('enabled', true);
    });

    it('should return the configured value', () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'enabled') {
          return false;
        }
        return true;
      });

      expect(config.isEnabled()).toBe(false);
    });
  });

  describe('isAutoHideEnabled', () => {
    it('should return true by default', () => {
      expect(config.isAutoHideEnabled()).toBe(true);
      expect(mockConfig.get).toHaveBeenCalledWith('autoHide', true);
    });

    it('should return the configured value', () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'autoHide') {
          return false;
        }
        return true;
      });

      expect(config.isAutoHideEnabled()).toBe(false);
    });
  });

  describe('getFilePatterns', () => {
    it('should return default patterns', () => {
      const defaultPatterns = [
        '.env*',
        '*.env',
        '*.sh',
        '*.json',
        '*.yaml',
        '*.yml',
        '*.properties',
        '*.toml',
      ];
      expect(config.getFilePatterns()).toEqual(defaultPatterns);
      expect(mockConfig.get).toHaveBeenCalledWith('files.patterns', defaultPatterns);
    });

    it('should return configured patterns', () => {
      const customPatterns = ['.env.local', '.env.production'];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'files.patterns') {
          return customPatterns;
        }
        return defaultValue;
      });

      expect(config.getFilePatterns()).toEqual(customPatterns);
    });
  });

  describe('getTextColor', () => {
    it('should return auto variable when set to auto', () => {
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'appearance.textColor') {
          return 'auto';
        }
        return defaultValue;
      });

      expect(config.getTextColor()).toBe('var(--vscode-button-foreground)');
      expect(mockConfig.get).toHaveBeenCalledWith('appearance.textColor', 'auto');
    });

    it('should return configured text color when not auto', () => {
      const customColor = '#FF0000';
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'appearance.textColor') {
          return customColor;
        }
        return defaultValue;
      });

      expect(config.getTextColor()).toBe(customColor);
    });
  });

  describe('getBackgroundColor', () => {
    it('should return auto variable when set to auto', () => {
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'appearance.backgroundColor') {
          return 'auto';
        }
        return defaultValue;
      });

      expect(config.getBackgroundColor()).toBe('var(--vscode-button-background)');
      expect(mockConfig.get).toHaveBeenCalledWith('appearance.backgroundColor', 'auto');
    });

    it('should return transparent when set to transparent', () => {
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'appearance.backgroundColor') {
          return 'transparent';
        }
        return defaultValue;
      });

      expect(config.getBackgroundColor()).toBe('transparent');
    });

    it('should return configured background color when not auto or transparent', () => {
      const customColor = '#0000FF';
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'appearance.backgroundColor') {
          return customColor;
        }
        return defaultValue;
      });

      expect(config.getBackgroundColor()).toBe(customColor);
    });
  });

  describe('enable/disable', () => {
    it('should update config to enable extension', async () => {
      await config.enable();
      expect(mockConfig.update).toHaveBeenCalledWith('enabled', true, true);
    });

    it('should update config to disable extension', async () => {
      await config.disable();
      expect(mockConfig.update).toHaveBeenCalledWith('enabled', false, true);
    });
  });

  describe('shouldShowPreview', () => {
    it('should return true by default', () => {
      expect(config.shouldShowPreview()).toBe(true);
      expect(mockConfig.get).toHaveBeenCalledWith('hover.showPreview', true);
    });

    it('should return configured value', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'hover.showPreview') {
          return false;
        }
        return defaultValue;
      });

      expect(config.shouldShowPreview()).toBe(false);
    });
  });

  describe('getHoverMessage', () => {
    it('should return default hover message', () => {
      const defaultMessage = 'Hidden by Camouflage';
      expect(config.getHoverMessage()).toBe(defaultMessage);
      expect(mockConfig.get).toHaveBeenCalledWith('hover.message', defaultMessage);
    });

    it('should return configured hover message', () => {
      const customMessage = 'Custom hover message';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'hover.message') {
          return customMessage;
        }
        return defaultValue;
      });

      expect(config.getHoverMessage()).toBe(customMessage);
    });
  });

  describe('isSelectiveHidingEnabled', () => {
    it('should return false by default', () => {
      expect(config.isSelectiveHidingEnabled()).toBe(false);
      expect(mockConfig.get).toHaveBeenCalledWith('selective.enabled', false);
    });

    it('should return the configured value', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'selective.enabled') {
          return true;
        }
        return defaultValue;
      });

      expect(config.isSelectiveHidingEnabled()).toBe(true);
    });
  });

  describe('getKeyPatterns', () => {
    it('should return default patterns', () => {
      const defaultPatterns = [
        '*KEY*',
        '*TOKEN*',
        '*SECRET*',
        '*PASSWORD*',
        '*PWD*',
        '*DB*',
        '*DATABASE*',
        '*PORT*',
      ];

      expect(config.getKeyPatterns()).toEqual(defaultPatterns);
      expect(mockConfig.get).toHaveBeenCalledWith('selective.keyPatterns', defaultPatterns);
    });

    it('should return configured patterns', () => {
      const customPatterns = ['*API*', '*CREDENTIAL*'];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'selective.keyPatterns') {
          return customPatterns;
        }
        return defaultValue;
      });

      expect(config.getKeyPatterns()).toEqual(customPatterns);
    });
  });

  describe('getExcludeKeys', () => {
    it('should return empty array by default', () => {
      const defaultExcludeKeys: string[] = [];
      expect(config.getExcludeKeys()).toEqual(defaultExcludeKeys);
      expect(mockConfig.get).toHaveBeenCalledWith('selective.excludeKeys', defaultExcludeKeys);
    });

    it('should return configured exclude keys', () => {
      const customExcludeKeys = ['PUBLIC_URL', 'NODE_ENV'];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'selective.excludeKeys') {
          return customExcludeKeys;
        }
        return defaultValue;
      });

      expect(config.getExcludeKeys()).toEqual(customExcludeKeys);
    });
  });

  describe('getAppearanceStyle', () => {
    it('should return text by default', () => {
      expect(config.getAppearanceStyle()).toBe('text');
      expect(mockConfig.get).toHaveBeenCalledWith('appearance.style', 'text');
    });

    it('should return configured style', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'appearance.style') {
          return 'stars';
        }
        return defaultValue;
      });

      expect(config.getAppearanceStyle()).toBe('stars');
    });
  });

  describe('getEnabledParsers', () => {
    it('should return default parsers', () => {
      const defaultParsers = ['env', 'json', 'yaml', 'properties', 'toml'];
      expect(config.getEnabledParsers()).toEqual(defaultParsers);
      expect(mockConfig.get).toHaveBeenCalledWith('parsers.enabled', defaultParsers);
    });

    it('should return configured parsers', () => {
      const customParsers = ['env', 'json'];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'parsers.enabled') {
          return customParsers;
        }
        return defaultValue;
      });

      expect(config.getEnabledParsers()).toEqual(customParsers);
    });
  });

  describe('getJsonNestedDepth', () => {
    it('should return 10 by default', () => {
      expect(config.getJsonNestedDepth()).toBe(10);
      expect(mockConfig.get).toHaveBeenCalledWith('parsers.json.nestedDepth', 10);
    });

    it('should return configured depth', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'parsers.json.nestedDepth') {
          return 5;
        }
        return defaultValue;
      });

      expect(config.getJsonNestedDepth()).toBe(5);
    });
  });

  describe('getYamlNestedDepth', () => {
    it('should return 10 by default', () => {
      expect(config.getYamlNestedDepth()).toBe(10);
      expect(mockConfig.get).toHaveBeenCalledWith('parsers.yaml.nestedDepth', 10);
    });

    it('should return configured depth', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'parsers.yaml.nestedDepth') {
          return 3;
        }
        return defaultValue;
      });

      expect(config.getYamlNestedDepth()).toBe(3);
    });
  });

  describe('isParserEnabled', () => {
    it('should return true for enabled parser', () => {
      expect(config.isParserEnabled('env')).toBe(true);
    });

    it('should return false for disabled parser', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'parsers.enabled') {
          return ['json', 'yaml'];
        }
        return defaultValue;
      });

      expect(config.isParserEnabled('env')).toBe(false);
      expect(config.isParserEnabled('json')).toBe(true);
    });
  });

  describe('getExcludedFiles', () => {
    it('should return empty array by default', () => {
      expect(config.getExcludedFiles()).toEqual([]);
      expect(mockConfig.get).toHaveBeenCalledWith('files.excludedFiles', []);
    });

    it('should return configured excluded files', () => {
      const excludedFiles = ['/path/to/file.json', 'config.yaml'];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'files.excludedFiles') {
          return excludedFiles;
        }
        return defaultValue;
      });

      expect(config.getExcludedFiles()).toEqual(excludedFiles);
    });
  });

  describe('isFileExcluded', () => {
    it('should return false when no files are excluded', () => {
      expect(config.isFileExcluded('/path/to/file.json')).toBe(false);
    });

    it('should return true for exact match', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'files.excludedFiles') {
          return ['/path/to/file.json'];
        }
        return defaultValue;
      });

      expect(config.isFileExcluded('/path/to/file.json')).toBe(true);
    });

    it('should return true when path ends with excluded pattern', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'files.excludedFiles') {
          return ['config.json'];
        }
        return defaultValue;
      });

      expect(config.isFileExcluded('/some/path/config.json')).toBe(true);
    });

    it('should normalize Windows paths', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'files.excludedFiles') {
          return ['path/to/file.json'];
        }
        return defaultValue;
      });

      expect(config.isFileExcluded('path\\to\\file.json')).toBe(true);
    });

    it('should return false for non-matching file', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'files.excludedFiles') {
          return ['other.json'];
        }
        return defaultValue;
      });

      expect(config.isFileExcluded('/path/to/file.json')).toBe(false);
    });
  });

  describe('addExcludedFile', () => {
    it('should add file to excluded list', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'files.excludedFiles') {
          return [];
        }
        return defaultValue;
      });

      await config.addExcludedFile('/path/to/file.json');

      expect(mockConfig.update).toHaveBeenCalledWith(
        'files.excludedFiles',
        ['/path/to/file.json'],
        true
      );
    });

    it('should not add duplicate file', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'files.excludedFiles') {
          return ['/path/to/file.json'];
        }
        return defaultValue;
      });

      await config.addExcludedFile('/path/to/file.json');

      expect(mockConfig.update).not.toHaveBeenCalled();
    });

    it('should normalize Windows paths when adding', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'files.excludedFiles') {
          return [];
        }
        return defaultValue;
      });

      await config.addExcludedFile('path\\to\\file.json');

      expect(mockConfig.update).toHaveBeenCalledWith(
        'files.excludedFiles',
        ['path/to/file.json'],
        true
      );
    });
  });

  describe('removeExcludedFile', () => {
    it('should remove file from excluded list', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'files.excludedFiles') {
          return ['/path/to/file.json', '/other/file.yaml'];
        }
        return defaultValue;
      });

      await config.removeExcludedFile('/path/to/file.json');

      expect(mockConfig.update).toHaveBeenCalledWith(
        'files.excludedFiles',
        ['/other/file.yaml'],
        true
      );
    });

    it('should not update if file is not in list', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'files.excludedFiles') {
          return ['/other/file.yaml'];
        }
        return defaultValue;
      });

      await config.removeExcludedFile('/path/to/file.json');

      expect(mockConfig.update).not.toHaveBeenCalled();
    });

    it('should remove file matching by path ending', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'files.excludedFiles') {
          return ['config.json'];
        }
        return defaultValue;
      });

      await config.removeExcludedFile('/full/path/to/config.json');

      expect(mockConfig.update).toHaveBeenCalledWith('files.excludedFiles', [], true);
    });
  });
});
