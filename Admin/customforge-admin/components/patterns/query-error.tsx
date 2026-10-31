import {ErrorState} from './error-state';
export function QueryError({error, retry}: {error: Error | null; retry: () => void}) {
  if (!error) return null;
  return <ErrorState title="This view couldn’t load" message={error.message} onRetry={retry} />;
}
