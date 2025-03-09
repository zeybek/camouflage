import * as bcrypt from 'bcrypt';
import * as vscode from 'vscode';
import * as config from '../utils/config';

export class PasswordManager {
  private static instance: PasswordManager;
  private password: string | undefined;
  private hashedPassword: string | undefined;
  private lastVerified: number = 0;
  private attempts: number = 0;
  private locked: boolean = false;

  private constructor() {}

  public static getInstance(): PasswordManager {
    if (!PasswordManager.instance) {
      PasswordManager.instance = new PasswordManager();
    }
    return PasswordManager.instance;
  }

  /**
   * Set or update the password
   */
  public async setPassword(): Promise<boolean> {
    const newPassword = await vscode.window.showInputBox({
      prompt: 'Set a password to protect sensitive values',
      password: true,
      validateInput: (value) => {
        return value.length < 4 ? 'Password must be at least 4 characters' : null;
      },
    });

    if (!newPassword) {
      return false;
    }

    const confirmPassword = await vscode.window.showInputBox({
      prompt: 'Confirm password',
      password: true,
    });

    if (newPassword !== confirmPassword) {
      vscode.window.showErrorMessage('Passwords do not match');
      return false;
    }

    this.hashedPassword = this.hashPassword(newPassword);

    // If remember password is enabled, store the password for the session
    if (config.isRememberPasswordEnabled()) {
      this.password = newPassword;
    }

    this.lastVerified = Date.now();
    this.attempts = 0;
    this.locked = false;

    vscode.window.showInformationMessage('Password protection enabled');
    return true;
  }

  /**
   * Verify the password
   */
  public async verifyPassword(): Promise<boolean> {
    // If password protection is not enabled, return true
    if (!this.isPasswordProtectionEnabled()) {
      return true;
    }

    // If locked due to too many attempts, show error
    if (this.locked && config.getMaxAttempts() > 0) {
      vscode.window.showErrorMessage(
        'Too many incorrect attempts. Please reset password in settings.'
      );
      return false;
    }

    // If password is remembered and timeout not exceeded, return true
    if (this.password && config.isRememberPasswordEnabled() && !this.isTimeoutExceeded()) {
      this.lastVerified = Date.now();
      return true;
    }

    // Ask for password
    const inputPassword = await vscode.window.showInputBox({
      prompt: 'Enter password to view sensitive values',
      password: true,
    });

    if (!inputPassword) {
      return false;
    }

    // Verify password
    const isValid = this.hashedPassword
      ? bcrypt.compareSync(inputPassword, this.hashedPassword)
      : false;

    if (isValid) {
      // Reset attempts and update last verified time
      this.attempts = 0;
      this.lastVerified = Date.now();

      // If remember password is enabled, store the password
      if (config.isRememberPasswordEnabled()) {
        this.password = inputPassword;
      }

      return true;
    } else {
      // Increment attempts
      this.attempts++;

      // Check if max attempts exceeded
      const maxAttempts = config.getMaxAttempts();
      if (maxAttempts > 0 && this.attempts >= maxAttempts) {
        this.locked = true;
        vscode.window.showErrorMessage(
          `Too many incorrect attempts. Please reset password in settings.`
        );
      } else {
        vscode.window.showErrorMessage(
          `Incorrect password. ${maxAttempts > 0 ? `Attempts: ${this.attempts}/${maxAttempts}` : ''}`
        );
      }

      return false;
    }
  }

  /**
   * Check if password protection is enabled
   */
  public isPasswordProtectionEnabled(): boolean {
    return config.isPasswordProtectionEnabled() && !!this.hashedPassword;
  }

  /**
   * Check if password timeout is exceeded
   */
  private isTimeoutExceeded(): boolean {
    const timeout = config.getPasswordTimeout();
    if (timeout <= 0) {
      return false; // No timeout
    }

    const elapsed = (Date.now() - this.lastVerified) / 1000;
    return elapsed > timeout;
  }

  /**
   * Hash password using bcrypt
   */
  private hashPassword(password: string): string {
    const saltRounds = 10;
    return bcrypt.hashSync(password, saltRounds);
  }

  /**
   * Reset password state
   */
  public reset(): void {
    this.password = undefined;
    this.hashedPassword = undefined;
    this.lastVerified = 0;
    this.attempts = 0;
    this.locked = false;
  }

  /**
   * Clear password (logout)
   */
  public clearPassword(): void {
    this.password = undefined;
    this.lastVerified = 0;
  }
}
