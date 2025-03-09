import { describe, expect, it } from '@jest/globals';
import * as decorators from '../index';

describe('Decorators index', () => {
  it('should export all decorators', () => {
    // Check if all decorators are exported
    expect(decorators).toHaveProperty('Debounce');
    expect(decorators).toHaveProperty('HandleErrors');
    expect(decorators).toHaveProperty('Log');
    expect(decorators).toHaveProperty('MeasurePerformance');
    expect(decorators).toHaveProperty('ValidateConfig');
  });

  it('should export decorators as functions', () => {
    // Check if exported decorators are functions
    expect(typeof decorators.Debounce).toBe('function');
    expect(typeof decorators.HandleErrors).toBe('function');
    expect(typeof decorators.Log).toBe('function');
    expect(typeof decorators.MeasurePerformance).toBe('function');
    expect(typeof decorators.ValidateConfig).toBe('function');
  });

  it('should return a function when called', () => {
    // Check if decorators return a function when called
    expect(typeof decorators.Debounce(100)).toBe('function');
    expect(typeof decorators.HandleErrors()).toBe('function');
    expect(typeof decorators.Log('test')).toBe('function');
    expect(typeof decorators.MeasurePerformance()).toBe('function');
    expect(typeof decorators.ValidateConfig()).toBe('function');
  });
});
