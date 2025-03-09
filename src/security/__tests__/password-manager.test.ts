import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as vscode from 'vscode';
import * as config from '../../utils/config';
import { PasswordManager } from '../password-manager';

// Mock dependencies
jest.mock(
  'vscode',
  () => ({
    window: {
      showInputBox: jest.fn(),
      showErrorMessage: jest.fn(),
      showInformationMessage: jest.fn(),
    },
  }),
  { virtual: true }
);

// Mock crypto
jest.mock(
  'crypto',
  () => ({
    createHash: jest.fn().mockImplementation(() => ({
      update: jest.fn().mockImplementation((password) => ({
        digest: jest.fn().mockImplementation(() => {
          // Return consistent hash values based on input
          if (password === 'password123') {
            return 'hashed-password-123';
          } else {
            return 'wrong-hashed-password';
          }
        }),
      })),
    })),
  }),
  { virtual: true }
);

// Mock config
jest.mock('../../utils/config', () => ({
  isPasswordProtectionEnabled: jest.fn(),
  isRememberPasswordEnabled: jest.fn(),
  getMaxAttempts: jest.fn(),
  getPasswordTimeout: jest.fn(),
}));

describe('PasswordManager', () => {
  let passwordManager: PasswordManager;
  let originalDateNow: () => number;

  beforeEach(() => {
    jest.clearAllMocks();
    passwordManager = PasswordManager.getInstance();
    passwordManager.reset();

    // Default mock implementations
    (config.isPasswordProtectionEnabled as jest.Mock).mockReturnValue(false);
    (config.isRememberPasswordEnabled as jest.Mock).mockReturnValue(true);
    (config.getMaxAttempts as jest.Mock).mockReturnValue(3);
    (config.getPasswordTimeout as jest.Mock).mockReturnValue(300);

    // Save original Date.now
    originalDateNow = Date.now;
  });

  afterEach(() => {
    // Restore original Date.now
    Date.now = originalDateNow;
  });

  describe('getInstance', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = PasswordManager.getInstance();
      const instance2 = PasswordManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('setPassword', () => {
    it('should set password when input and confirmation match', async () => {
      (vscode.window.showInputBox as jest.Mock)
        .mockResolvedValueOnce('password123' as never)
        .mockResolvedValueOnce('password123' as never);

      const result = await passwordManager.setPassword();

      expect(result).toBe(true);
      expect(vscode.window.showInputBox).toHaveBeenCalledTimes(2);
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Password protection enabled'
      );
    });

    it('should return false when user cancels first input', async () => {
      (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce(undefined as never);

      const result = await passwordManager.setPassword();

      expect(result).toBe(false);
      expect(vscode.window.showInputBox).toHaveBeenCalledTimes(1);
    });

    it('should return false when passwords do not match', async () => {
      (vscode.window.showInputBox as jest.Mock)
        .mockResolvedValueOnce('password123' as never)
        .mockResolvedValueOnce('different' as never);

      const result = await passwordManager.setPassword();

      expect(result).toBe(false);
      expect(vscode.window.showInputBox).toHaveBeenCalledTimes(2);
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Passwords do not match');
    });

    it('should validate password length', async () => {
      (vscode.window.showInputBox as jest.Mock)
        .mockImplementationOnce(async (options: any) => {
          const validation = options.validateInput('123');
          expect(validation).toBe('Password must be at least 4 characters');
          return 'password123';
        })
        .mockResolvedValueOnce('password123' as never);

      const result = await passwordManager.setPassword();

      expect(result).toBe(true);
    });
  });

  describe('verifyPassword', () => {
    it('should return true if password protection is not enabled', async () => {
      (config.isPasswordProtectionEnabled as jest.Mock).mockReturnValue(false);

      const result = await passwordManager.verifyPassword();

      expect(result).toBe(true);
      expect(vscode.window.showInputBox).not.toHaveBeenCalled();
    });

    it('should verify password correctly when input matches', async () => {
      // First set a password
      (vscode.window.showInputBox as jest.Mock)
        .mockResolvedValueOnce('password123' as never)
        .mockResolvedValueOnce('password123' as never);

      await passwordManager.setPassword();

      // Reset mocks for verification
      jest.clearAllMocks();

      // Mock config to enable password protection
      (config.isPasswordProtectionEnabled as jest.Mock).mockReturnValue(true);
      // Disable remember password for this test to force input
      (config.isRememberPasswordEnabled as jest.Mock).mockReturnValue(false);

      // Mock the password input for verification
      (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce('password123' as never);

      const result = await passwordManager.verifyPassword();

      expect(result).toBe(true);
      expect(vscode.window.showInputBox).toHaveBeenCalledTimes(1);
    });

    it('should remember password when verification succeeds and remember is enabled', async () => {
      // First set a password
      (vscode.window.showInputBox as jest.Mock)
        .mockResolvedValueOnce('password123' as never)
        .mockResolvedValueOnce('password123' as never);

      await passwordManager.setPassword();

      // Reset mocks for verification
      jest.clearAllMocks();

      // Mock config to enable password protection and remember password
      (config.isPasswordProtectionEnabled as jest.Mock).mockReturnValue(true);
      (config.isRememberPasswordEnabled as jest.Mock).mockReturnValue(true);

      // Clear remembered password to force input
      passwordManager.clearPassword();

      // First verification - should ask for password
      (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce('password123' as never);
      const result1 = await passwordManager.verifyPassword();
      expect(result1).toBe(true);
      expect(vscode.window.showInputBox).toHaveBeenCalledTimes(1);

      // Reset mocks for second verification
      jest.clearAllMocks();

      // Second verification - should NOT ask for password (remembered)
      const result2 = await passwordManager.verifyPassword();
      expect(result2).toBe(true);
      expect(vscode.window.showInputBox).not.toHaveBeenCalled();
    });

    it('should return false when password verification fails', async () => {
      // First set a password
      (vscode.window.showInputBox as jest.Mock)
        .mockResolvedValueOnce('password123' as never)
        .mockResolvedValueOnce('password123' as never);

      await passwordManager.setPassword();

      // Reset mocks for verification
      jest.clearAllMocks();

      // Mock config to enable password protection
      (config.isPasswordProtectionEnabled as jest.Mock).mockReturnValue(true);
      // Disable remember password for this test to force input
      (config.isRememberPasswordEnabled as jest.Mock).mockReturnValue(false);

      // Mock the password input for verification with wrong password
      (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce('wrong-password' as never);

      const result = await passwordManager.verifyPassword();

      expect(result).toBe(false);
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    it('should return false when user cancels password input', async () => {
      // First set a password
      (vscode.window.showInputBox as jest.Mock)
        .mockResolvedValueOnce('password123' as never)
        .mockResolvedValueOnce('password123' as never);

      await passwordManager.setPassword();

      // Reset mocks for verification
      jest.clearAllMocks();

      // Mock config to enable password protection
      (config.isPasswordProtectionEnabled as jest.Mock).mockReturnValue(true);
      // Disable remember password for this test to force input
      (config.isRememberPasswordEnabled as jest.Mock).mockReturnValue(false);

      // Mock the password input for verification (user cancels)
      (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce(undefined as never);

      const result = await passwordManager.verifyPassword();

      expect(result).toBe(false);
    });

    it('should lock after max attempts', async () => {
      // First set a password
      (vscode.window.showInputBox as jest.Mock)
        .mockResolvedValueOnce('password123' as never)
        .mockResolvedValueOnce('password123' as never);

      await passwordManager.setPassword();

      // Reset mocks for verification
      jest.clearAllMocks();

      // Mock config to enable password protection
      (config.isPasswordProtectionEnabled as jest.Mock).mockReturnValue(true);
      (config.getMaxAttempts as jest.Mock).mockReturnValue(3);
      // Disable remember password for this test to force input
      (config.isRememberPasswordEnabled as jest.Mock).mockReturnValue(false);

      // Mock the password input for verification (3 failed attempts)
      (vscode.window.showInputBox as jest.Mock)
        .mockResolvedValueOnce('wrong1' as never)
        .mockResolvedValueOnce('wrong2' as never)
        .mockResolvedValueOnce('wrong3' as never);

      // First attempt
      await passwordManager.verifyPassword();
      // Second attempt
      await passwordManager.verifyPassword();
      // Third attempt (should lock)
      await passwordManager.verifyPassword();

      // Reset mocks for final verification
      jest.clearAllMocks();

      // Try again after locked
      const result = await passwordManager.verifyPassword();

      expect(result).toBe(false);
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Too many incorrect attempts. Please reset password in settings.'
      );
    });

    it('should show error message without attempts count when maxAttempts is 0', async () => {
      // First set a password
      (vscode.window.showInputBox as jest.Mock)
        .mockResolvedValueOnce('password123' as never)
        .mockResolvedValueOnce('password123' as never);

      await passwordManager.setPassword();

      // Reset mocks for verification
      jest.clearAllMocks();

      // Mock config to enable password protection with unlimited attempts
      (config.isPasswordProtectionEnabled as jest.Mock).mockReturnValue(true);
      (config.getMaxAttempts as jest.Mock).mockReturnValue(0);
      // Disable remember password for this test to force input
      (config.isRememberPasswordEnabled as jest.Mock).mockReturnValue(false);

      // Mock the password input for verification with wrong password
      (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce('wrong-password' as never);

      const result = await passwordManager.verifyPassword();

      expect(result).toBe(false);
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Incorrect password. ');

      // Try multiple failed attempts to ensure maxAttempts=0 doesn't lock the account
      jest.clearAllMocks();
      (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce('wrong-password' as never);

      const result2 = await passwordManager.verifyPassword();
      expect(result2).toBe(false);
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Incorrect password. ');

      // Verify we can still enter the correct password
      jest.clearAllMocks();

      // Reset crypto mock to return correct hash for correct password
      jest.resetModules();
      jest.mock(
        'crypto',
        () => ({
          createHash: jest.fn().mockImplementation(() => ({
            update: jest.fn().mockImplementation(() => ({
              digest: jest.fn().mockReturnValue('hashed-password-123'),
            })),
          })),
        }),
        { virtual: true }
      );

      (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce('password123' as never);

      const result3 = await passwordManager.verifyPassword();
      expect(result3).toBe(true);
    });

    it('should not timeout when timeout is set to 0', async () => {
      // First set a password
      (vscode.window.showInputBox as jest.Mock)
        .mockResolvedValueOnce('password123' as never)
        .mockResolvedValueOnce('password123' as never);

      await passwordManager.setPassword();

      // Reset mocks for verification
      jest.clearAllMocks();

      // Mock config to enable password protection with no timeout
      (config.isPasswordProtectionEnabled as jest.Mock).mockReturnValue(true);
      (config.isRememberPasswordEnabled as jest.Mock).mockReturnValue(true);
      (config.getPasswordTimeout as jest.Mock).mockReturnValue(0);

      // First verification should succeed without input (remembered)
      const result1 = await passwordManager.verifyPassword();
      expect(result1).toBe(true);
      expect(vscode.window.showInputBox).not.toHaveBeenCalled();

      // Simulate time passing (more than normal timeout)
      jest.clearAllMocks();
      // Should still succeed without input due to no timeout
      const result2 = await passwordManager.verifyPassword();
      expect(result2).toBe(true);
      expect(vscode.window.showInputBox).not.toHaveBeenCalled();
    });

    it('should handle timeout exceeded', async () => {
      // First set a password
      (vscode.window.showInputBox as jest.Mock)
        .mockResolvedValueOnce('password123' as never)
        .mockResolvedValueOnce('password123' as never);

      await passwordManager.setPassword();

      // Reset mocks for verification
      jest.clearAllMocks();

      // Mock config to enable password protection with timeout
      (config.isPasswordProtectionEnabled as jest.Mock).mockReturnValue(true);
      (config.isRememberPasswordEnabled as jest.Mock).mockReturnValue(true);
      (config.getPasswordTimeout as jest.Mock).mockReturnValue(300);

      // Mock Date.now to simulate time passing
      const currentTime = 1000000;

      // First set the initial time
      Date.now = jest.fn(() => currentTime) as any;

      // First verification should succeed without input (remembered)
      const result1 = await passwordManager.verifyPassword();
      expect(result1).toBe(true);
      expect(vscode.window.showInputBox).not.toHaveBeenCalled();

      // Simulate time passing (more than timeout)
      jest.clearAllMocks();
      Date.now = jest.fn(() => currentTime + 301 * 1000) as any; // 301 seconds later

      // Mock the password input for verification after timeout
      (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce('password123' as never);

      // Should ask for password again due to timeout
      const result2 = await passwordManager.verifyPassword();
      expect(result2).toBe(true);
      expect(vscode.window.showInputBox).toHaveBeenCalled();
    });
  });

  describe('isPasswordProtectionEnabled', () => {
    it('should return false when config is disabled', () => {
      (config.isPasswordProtectionEnabled as jest.Mock).mockReturnValue(false);

      const result = passwordManager.isPasswordProtectionEnabled();

      expect(result).toBe(false);
    });

    it('should return false when config is enabled but no password is set', () => {
      (config.isPasswordProtectionEnabled as jest.Mock).mockReturnValue(true);

      const result = passwordManager.isPasswordProtectionEnabled();

      expect(result).toBe(false);
    });

    it('should return true when config is enabled and password is set', async () => {
      // First set a password
      (vscode.window.showInputBox as jest.Mock)
        .mockResolvedValueOnce('password123' as never)
        .mockResolvedValueOnce('password123' as never);

      await passwordManager.setPassword();

      // Mock config to enable password protection
      (config.isPasswordProtectionEnabled as jest.Mock).mockReturnValue(true);

      const result = passwordManager.isPasswordProtectionEnabled();

      expect(result).toBe(true);
    });
  });

  describe('reset and clearPassword', () => {
    it('should reset all password state', async () => {
      // First set a password
      (vscode.window.showInputBox as jest.Mock)
        .mockResolvedValueOnce('password123' as never)
        .mockResolvedValueOnce('password123' as never);

      await passwordManager.setPassword();

      // Mock config to enable password protection
      (config.isPasswordProtectionEnabled as jest.Mock).mockReturnValue(true);

      // Verify password is set
      expect(passwordManager.isPasswordProtectionEnabled()).toBe(true);

      // Reset password
      passwordManager.reset();

      // Verify password is reset
      expect(passwordManager.isPasswordProtectionEnabled()).toBe(false);
    });

    it('should clear remembered password', async () => {
      // First set a password
      (vscode.window.showInputBox as jest.Mock)
        .mockResolvedValueOnce('password123' as never)
        .mockResolvedValueOnce('password123' as never);

      await passwordManager.setPassword();

      // Mock config
      (config.isPasswordProtectionEnabled as jest.Mock).mockReturnValue(true);
      (config.isRememberPasswordEnabled as jest.Mock).mockReturnValue(true);

      // Verify password works without input (remembered)
      jest.clearAllMocks();
      const result1 = await passwordManager.verifyPassword();
      expect(result1).toBe(true);
      expect(vscode.window.showInputBox).not.toHaveBeenCalled();

      // Clear password
      passwordManager.clearPassword();

      // Verify password needs to be input again
      jest.clearAllMocks();

      // Disable remember password to force input
      (config.isRememberPasswordEnabled as jest.Mock).mockReturnValue(false);
      (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce('password123' as never);

      const result2 = await passwordManager.verifyPassword();
      expect(result2).toBe(true);
      expect(vscode.window.showInputBox).toHaveBeenCalled();
    });
  });
});
