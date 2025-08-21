import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Tester from './tester/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Tester />
  </StrictMode>,
);


