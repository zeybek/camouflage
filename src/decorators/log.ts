/**
 * Decorator to log method execution
 */
export function Log(message: string) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      console.log(`[Camouflage] ${message}`);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
