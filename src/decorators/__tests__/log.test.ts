import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Log } from '../log';

describe('Log decorator', () => {
  // Mock console.log
  let consoleLogSpy: jest.Mock;

  beforeEach(() => {
    // Mock console.log before each test
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}) as jest.Mock;
  });

  afterEach(() => {
    // Clean up mocks after each test
    consoleLogSpy.mockRestore();
  });

  it('should log a message when the decorated method is called', () => {
    // Arrange
    const testMessage = 'Test log message';

    // Apply decorator manually
    const descriptor: PropertyDescriptor = {
      value: function (param: string) {
        return `Method executed with ${param}`;
      },
    };

    // Apply decorator
    const decoratedDescriptor = Log(testMessage)({} as any, 'testMethod', descriptor);

    // Act
    const result = decoratedDescriptor.value('test parameter');

    // Assert
    expect(consoleLogSpy).toHaveBeenCalledWith(`[Camouflage] ${testMessage}`);
    expect(result).toBe('Method executed with test parameter');
  });

  it('should preserve the original method functionality', () => {
    // Arrange
    let counter = 0;

    const descriptor: PropertyDescriptor = {
      value: function () {
        counter += 1;
        return counter;
      },
    };

    // Apply decorator
    const decoratedDescriptor = Log('Counter incremented')(
      {} as any,
      'incrementCounter',
      descriptor
    );

    // Act
    const result = decoratedDescriptor.value();

    // Assert
    expect(result).toBe(1);
    expect(counter).toBe(1);
  });

  it('should work with methods that have multiple parameters', () => {
    // Arrange
    const descriptor: PropertyDescriptor = {
      value: function (a: number, b: number) {
        return a + b;
      },
    };

    // Apply decorator
    const decoratedDescriptor = Log('Adding numbers')({} as any, 'add', descriptor);

    // Act
    const result = decoratedDescriptor.value(2, 3);

    // Assert
    expect(consoleLogSpy).toHaveBeenCalledWith('[Camouflage] Adding numbers');
    expect(result).toBe(5);
  });

  it('should work with methods that return void', () => {
    // Arrange
    let wasExecuted = false;

    const descriptor: PropertyDescriptor = {
      value: function () {
        wasExecuted = true;
      },
    };

    // Apply decorator
    const decoratedDescriptor = Log('Void method')({} as any, 'doSomething', descriptor);

    // Act
    decoratedDescriptor.value();

    // Assert
    expect(consoleLogSpy).toHaveBeenCalledWith('[Camouflage] Void method');
    expect(wasExecuted).toBe(true);
  });
});
