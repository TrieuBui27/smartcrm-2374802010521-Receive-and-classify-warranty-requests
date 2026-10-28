// Gọi một hàm API và trả về { data, loading, error, reload } để DataState vẽ đủ ba trạng thái.
import { useCallback, useEffect, useState } from 'react';

export function useApi(call, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let huy = false;
    setState({ data: null, loading: true, error: null });
    call()
      .then(data => { if (!huy) setState({ data, loading: false, error: null }); })
      .catch(error => { if (!huy) setState({ data: null, loading: false, error }); });
    return () => { huy = true; }; // tránh cập nhật sau khi trang đã chuyển đi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick(t => t + 1), []);
  return { ...state, reload };
}