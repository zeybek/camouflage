import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as vscode from 'vscode';
import { HandleErrors } from '../handle-errors';

// Mock VS Code API
jest.mock('vscode', () => ({
  window: {
    showErrorMessage: jest.fn(),
  },
}));

describe('HandleErrors decorator', () => {
  let consoleErrorSpy: jest.Mock;

  beforeEach(() => {
    // Mock console.error before each test
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}) as jest.Mock;

    // Reset VS Code showErrorMessage
    (vscode.window.showErrorMessage as jest.Mock).mockClear();
  });

  afterEach(() => {
    // Clean up mocks after each test
    consoleErrorSpy.mockRestore();
  });

  it('should catch errors and show error message', () => {
    // Arrange
    const errorMessage = 'Test error';

    const descriptor: PropertyDescriptor = {
      value: function () {
        throw new Error(errorMessage);
      },
    };

    // Apply decorator
    const decoratedDescriptor = HandleErrors()({} as any, 'errorMethod', descriptor);

    // Act
    decoratedDescriptor.value();

    // Assert
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      `Camouflage error: Error: ${errorMessage}`
    );
  });

  it('should not affect methods that do not throw errors', () => {
    // Arrange
    const mockFn = jest.fn().mockReturnValue('success');

    const descriptor: PropertyDescriptor = {
      value: mockFn,
    };

    // Apply decorator
    const decoratedDescriptor = HandleErrors()({} as any, 'successMethod', descriptor);

    // Act
    const result = decoratedDescriptor.value();

    // Assert
    expect(result).toBe('success');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
  });

  it('should handle different types of errors', () => {
    // Arrange
    const descriptor1: PropertyDescriptor = {
      value: function () {
        throw new TypeError('Type error');
      },
    };

    const descriptor2: PropertyDescriptor = {
      value: function () {
        throw 'String error'; // Throwing error as string
      },
    };

    // Apply decorators
    const decoratedDescriptor1 = HandleErrors()({} as any, 'typeErrorMethod', descriptor1);
    const decoratedDescriptor2 = HandleErrors()({} as any, 'stringErrorMethod', descriptor2);

    // Act
    decoratedDescriptor1.value();
    decoratedDescriptor2.value();

    // Assert
    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    expect(vscode.window.showErrorMessage).toHaveBeenCalledTimes(2);
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Camouflage error: TypeError: Type error'
    );
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Camouflage error: String error');
  });

  it('should preserve the original method arguments', () => {
    // Arrange
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockFn = jest.fn().mockImplementation(function (a: any, b: any) {
      if (a < 0 || b < 0) {
        throw new Error('Negative numbers not allowed');
      }
      return a + b;
    });

    const descriptor: PropertyDescriptor = {
      value: mockFn,
    };

    // Apply decorator
    const decoratedDescriptor = HandleErrors()({} as any, 'addMethod', descriptor);

    // Act - success case
    const successResult = decoratedDescriptor.value(2, 3);

    // Act - error case
    decoratedDescriptor.value(-1, 5);

    // Assert
    expect(successResult).toBe(5);
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenCalledWith(2, 3);
    expect(mockFn).toHaveBeenCalledWith(-1, 5);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(vscode.window.showErrorMessage).toHaveBeenCalledTimes(1);
  });
});
