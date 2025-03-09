import * as vscode from 'vscode';

/**
 * Decorator to handle errors in method execution
 */
export function HandleErrors() {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      try {
        return originalMethod.apply(this, args);
      } catch (error) {
        console.error('[Camouflage] Error:', error);
        vscode.window.showErrorMessage(`Camouflage error: ${error}`);
      }
    };

    return descriptor;
  };
}
