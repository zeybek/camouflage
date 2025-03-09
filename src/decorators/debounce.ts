/**
 * Decorator to debounce method execution
 */
export function Debounce(wait: number) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    let timeout: NodeJS.Timeout;

    descriptor.value = function (...args: any[]) {
      clearTimeout(timeout);
      timeout = setTimeout(() => originalMethod.apply(this, args), wait);
    };

    return descriptor;
  };
}
