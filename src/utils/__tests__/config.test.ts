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
      const defaultPatterns = ['.env*', '*.env'];
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

    it('should return empty array when config returns undefined', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'files.patterns') {
          return undefined;
        }
        return defaultValue;
      });

      expect(config.getFilePatterns()).toEqual([]);
    });
  });

  describe('getTextColor', () => {
    it('should return default text color', () => {
      const defaultColor = '#FFFFFF';
      expect(config.getTextColor()).toBe(defaultColor);
      expect(mockConfig.get).toHaveBeenCalledWith('appearance.textColor', defaultColor);
    });

    it('should return configured text color', () => {
      const customColor = '#FF0000';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    it('should return default background color', () => {
      const defaultColor = '#2F7FE5';
      expect(config.getBackgroundColor()).toBe(defaultColor);
      expect(mockConfig.get).toHaveBeenCalledWith('appearance.backgroundColor', defaultColor);
    });

    it('should return configured background color', () => {
      const customColor = '#0000FF';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      const defaultValue = false;
      expect(config.shouldShowPreview()).toBe(defaultValue);
      expect(mockConfig.get).toHaveBeenCalledWith('hover.showPreview', defaultValue);
    });

    it('should return configured value', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'hover.showPreview') {
          return true;
        }
        return defaultValue;
      });

      expect(config.shouldShowPreview()).toBe(true);
    });
  });

  describe('getHoverMessage', () => {
    it('should return default hover message', () => {
      const defaultMessage = 'Environment value hidden by Camouflage extension';
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

    it('should return empty array when config returns undefined', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'selective.keyPatterns') {
          return undefined;
        }
        return defaultValue;
      });

      expect(config.getKeyPatterns()).toEqual([]);
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

    it('should return empty array when config returns undefined', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'selective.excludeKeys') {
          return undefined;
        }
        return defaultValue;
      });

      expect(config.getExcludeKeys()).toEqual([]);
    });
  });

  // Password protection tests
  describe('isPasswordProtectionEnabled', () => {
    it('should return false by default', () => {
      expect(config.isPasswordProtectionEnabled()).toBe(false);
      expect(mockConfig.get).toHaveBeenCalledWith('security.passwordProtection', false);
    });

    it('should return the configured value', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'security.passwordProtection') {
          return true;
        }
        return defaultValue;
      });

      expect(config.isPasswordProtectionEnabled()).toBe(true);
    });
  });

  describe('getPasswordTimeout', () => {
    it('should return default timeout', () => {
      const defaultTimeout = 300;
      expect(config.getPasswordTimeout()).toBe(defaultTimeout);
      expect(mockConfig.get).toHaveBeenCalledWith('security.passwordTimeout', defaultTimeout);
    });

    it('should return configured timeout', () => {
      const customTimeout = 600;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'security.passwordTimeout') {
          return customTimeout;
        }
        return defaultValue;
      });

      expect(config.getPasswordTimeout()).toBe(customTimeout);
    });
  });

  describe('getMaxAttempts', () => {
    it('should return default max attempts', () => {
      const defaultMaxAttempts = 3;
      expect(config.getMaxAttempts()).toBe(defaultMaxAttempts);
      expect(mockConfig.get).toHaveBeenCalledWith('security.maxAttempts', defaultMaxAttempts);
    });

    it('should return configured max attempts', () => {
      const customMaxAttempts = 5;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'security.maxAttempts') {
          return customMaxAttempts;
        }
        return defaultValue;
      });

      expect(config.getMaxAttempts()).toBe(customMaxAttempts);
    });
  });

  describe('isRememberPasswordEnabled', () => {
    it('should return true by default', () => {
      expect(config.isRememberPasswordEnabled()).toBe(true);
      expect(mockConfig.get).toHaveBeenCalledWith('security.rememberPassword', true);
    });

    it('should return the configured value', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'security.rememberPassword') {
          return false;
        }
        return defaultValue;
      });

      expect(config.isRememberPasswordEnabled()).toBe(false);
    });
  });

  describe('enablePasswordProtection/disablePasswordProtection', () => {
    it('should update config to enable password protection', async () => {
      await config.enablePasswordProtection();
      expect(mockConfig.update).toHaveBeenCalledWith('security.passwordProtection', true, true);
    });

    it('should update config to disable password protection', async () => {
      await config.disablePasswordProtection();
      expect(mockConfig.update).toHaveBeenCalledWith('security.passwordProtection', false, true);
    });
  });
});
