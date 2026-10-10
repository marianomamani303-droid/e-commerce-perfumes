import { useEffect, useReducer, useCallback } from 'react';
import { api, readableError } from '../services/api';
const reducer = (state, action) =>
  action.reload
    ? { ...state, version: state.version + 1, loading: true, error: '' }
    : { ...state, ...action };
export function useResource(path, fallback = null) {
  const [state, dispatch] = useReducer(reducer, {
    data: fallback,
    loading: true,
    error: '',
    version: 0,
  });
  const reload = useCallback(() => dispatch({ reload: true }), []);
  useEffect(() => {
    const controller = new AbortController();
    api(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) dispatch({ data, loading: false, error: '' });
      })
      .catch((error) => {
        if (!controller.signal.aborted) dispatch({ error: readableError(error), loading: false });
      });
    return () => controller.abort();
  }, [path, state.version]);
  return { ...state, reload };
}
