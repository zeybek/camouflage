import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MeasurePerformance } from '../measure-performance';

describe('MeasurePerformance decorator', () => {
  let consoleLogSpy: jest.Mock;
  let performanceNowSpy: any;

  beforeEach(() => {
    // Mock console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}) as jest.Mock;

    // Mock performance.now
    performanceNowSpy = jest.spyOn(performance, 'now');

    // Return 0 on first call, 100 on second call (simulate 100ms elapsed)
    performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(100);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    performanceNowSpy.mockRestore();
  });

  it('should measure and log the execution time', () => {
    // Arrange
    const mockFn = jest.fn().mockReturnValue('result');

    const descriptor: PropertyDescriptor = {
      value: mockFn,
    };

    // Apply decorator
    const decoratedDescriptor = MeasurePerformance()({} as any, 'measuredMethod', descriptor);

    // Act
    const result = decoratedDescriptor.value();

    // Assert
    expect(result).toBe('result');
    expect(performanceNowSpy).toHaveBeenCalledTimes(2);
    expect(consoleLogSpy).toHaveBeenCalledWith('[Camouflage] Performance: 100ms');
  });

  it('should work with methods that have parameters', () => {
    // Arrange
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockFn = jest.fn().mockImplementation(function (a: any, b: any) {
      return a + b;
    });

    const descriptor: PropertyDescriptor = {
      value: mockFn,
    };

    // Apply decorator
    const decoratedDescriptor = MeasurePerformance()({} as any, 'addMethod', descriptor);

    // Act
    const result = decoratedDescriptor.value(2, 3);

    // Assert
    expect(result).toBe(5);
    expect(mockFn).toHaveBeenCalledWith(2, 3);
    expect(performanceNowSpy).toHaveBeenCalledTimes(2);
    expect(consoleLogSpy).toHaveBeenCalledWith('[Camouflage] Performance: 100ms');
  });

  it('should handle methods that throw errors', () => {
    // Arrange
    const errorMessage = 'Test error';
    const mockFn = jest.fn().mockImplementation(() => {
      throw new Error(errorMessage);
    });

    const descriptor: PropertyDescriptor = {
      value: mockFn,
    };

    // Apply decorator
    const decoratedDescriptor = MeasurePerformance()({} as any, 'errorMethod', descriptor);

    // Set new mock values
    performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(100);

    // Act & Assert
    expect(() => decoratedDescriptor.value()).toThrow(errorMessage);
    expect(performanceNowSpy).toHaveBeenCalledTimes(1); // performance.now is not called a second time in case of error
    expect(consoleLogSpy).not.toHaveBeenCalled(); // log is not called in case of error
  });

  it('should preserve the context (this) when calling the original method', () => {
    // Arrange
    const context = { value: 42 };

    const descriptor: PropertyDescriptor = {
      value: function () {
        return this.value;
      },
    };

    // Apply decorator
    const decoratedDescriptor = MeasurePerformance()({} as any, 'contextMethod', descriptor);

    // Act
    const result = decoratedDescriptor.value.call(context);

    // Assert
    expect(result).toBe(42);
    expect(performanceNowSpy).toHaveBeenCalledTimes(2);
    expect(consoleLogSpy).toHaveBeenCalledWith('[Camouflage] Performance: 100ms');
  });
});
