/**
 * Decorator to measure method performance
 */
export function MeasurePerformance() {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const start = performance.now();
      const result = originalMethod.apply(this, args);
      const end = performance.now();
      console.log(`[Camouflage] Performance: ${end - start}ms`);
      return result;
    };

    return descriptor;
  };
}
