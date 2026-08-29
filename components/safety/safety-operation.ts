export type SafetyOperationRunParams<T> = {
  operation: () => Promise<T> | T;
  onPendingChange: (isSubmitting: boolean) => void;
  onSuccess: (value: T) => void;
  onError: (error: unknown) => void;
};

export type SafetyOperationController = {
  advanceSession: () => boolean;
  isSubmitting: () => boolean;
  syncSessionIdentity: (sessionIdentity: string) => boolean;
  run: <T>(params: SafetyOperationRunParams<T>) => Promise<void>;
};

export function createSafetyOperationController(
  initialSessionIdentity?: string,
): SafetyOperationController {
  let sessionGeneration = 0;
  let sessionIdentity = initialSessionIdentity;
  let pendingCount = 0;

  return {
    advanceSession() {
      sessionGeneration += 1;
      return pendingCount > 0;
    },
    isSubmitting() {
      return pendingCount > 0;
    },
    syncSessionIdentity(nextSessionIdentity) {
      if (sessionIdentity === nextSessionIdentity) return false;
      sessionIdentity = nextSessionIdentity;
      sessionGeneration += 1;
      return true;
    },
    async run<T>({
      operation,
      onPendingChange,
      onSuccess,
      onError,
    }: SafetyOperationRunParams<T>) {
      const operationSession = sessionGeneration;
      pendingCount += 1;
      onPendingChange(true);

      try {
        const value = await operation();
        if (operationSession === sessionGeneration) {
          onSuccess(value);
        }
      } catch (error) {
        if (operationSession === sessionGeneration) {
          onError(error);
        }
      } finally {
        pendingCount = Math.max(0, pendingCount - 1);
        onPendingChange(pendingCount > 0);
      }
    },
  };
}
