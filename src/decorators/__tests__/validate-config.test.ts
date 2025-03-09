import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as vscode from 'vscode';
import { ValidateConfig } from '../validate-config';

// Mock VS Code API
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn(),
  },
}));

describe('ValidateConfig decorator', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should throw an error if configuration is not found', () => {
    // Arrange
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(null);

    const descriptor: PropertyDescriptor = {
      value: jest.fn().mockReturnValue('success'),
    };

    // Apply decorator
    const decoratedDescriptor = ValidateConfig()({} as any, 'configMethod', descriptor);

    // Act & Assert
    expect(() => decoratedDescriptor.value()).toThrow('Configuration not found');
    expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('camouflage');
  });

  it('should call the original method if configuration is found', () => {
    // Arrange
    const mockConfig = {
      get: jest.fn(),
      update: jest.fn(),
      has: jest.fn(),
    };

    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

    const mockFn = jest.fn().mockReturnValue('success');

    const descriptor: PropertyDescriptor = {
      value: mockFn,
    };

    // Apply decorator
    const decoratedDescriptor = ValidateConfig()({} as any, 'configMethod', descriptor);

    // Act
    const result = decoratedDescriptor.value('arg1', 'arg2');

    // Assert
    expect(result).toBe('success');
    expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('camouflage');
    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should preserve the context (this) when calling the original method', () => {
    // Arrange
    const mockConfig = {
      get: jest.fn(),
      update: jest.fn(),
      has: jest.fn(),
    };

    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

    const context = { value: 42 };

    const descriptor: PropertyDescriptor = {
      value: function () {
        return this.value;
      },
    };

    // Apply decorator
    const decoratedDescriptor = ValidateConfig()({} as any, 'contextMethod', descriptor);

    // Act
    const result = decoratedDescriptor.value.call(context);

    // Assert
    expect(result).toBe(42);
    expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('camouflage');
  });

  it('should handle methods with different return types', () => {
    // Arrange
    const mockConfig = {
      get: jest.fn(),
      update: jest.fn(),
      has: jest.fn(),
    };

    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

    // Method that returns a number
    const numberDescriptor: PropertyDescriptor = {
      value: jest.fn().mockReturnValue(42),
    };

    // Method that returns a boolean
    const booleanDescriptor: PropertyDescriptor = {
      value: jest.fn().mockReturnValue(true),
    };

    // Method that returns an object
    const objectDescriptor: PropertyDescriptor = {
      value: jest.fn().mockReturnValue({ key: 'value' }),
    };

    // Apply decorators
    const decoratedNumberDescriptor = ValidateConfig()({} as any, 'numberMethod', numberDescriptor);
    const decoratedBooleanDescriptor = ValidateConfig()(
      {} as any,
      'booleanMethod',
      booleanDescriptor
    );
    const decoratedObjectDescriptor = ValidateConfig()({} as any, 'objectMethod', objectDescriptor);

    // Act
    const numberResult = decoratedNumberDescriptor.value();
    const booleanResult = decoratedBooleanDescriptor.value();
    const objectResult = decoratedObjectDescriptor.value();

    // Assert
    expect(numberResult).toBe(42);
    expect(booleanResult).toBe(true);
    expect(objectResult).toEqual({ key: 'value' });
    expect(vscode.workspace.getConfiguration).toHaveBeenCalledTimes(3);
  });
});
