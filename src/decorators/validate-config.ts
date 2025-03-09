import * as vscode from 'vscode';

/**
 * Decorator to validate configuration before method execution
 */
export function ValidateConfig() {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const config = vscode.workspace.getConfiguration('camouflage');
      if (!config) {
        throw new Error('Configuration not found');
      }
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
