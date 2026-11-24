import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

// Existing report and authentication controllers attach after the initial view is mounted.
export function mount(page) {
  const root = createRoot(document.getElementById('root'));
  flushSync(() => root.render(page));
}
