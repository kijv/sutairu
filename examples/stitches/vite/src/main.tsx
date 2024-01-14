import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import * as styles from './app.css';
import { globals } from './index.css';
import './stitches.css';

globals();

const root = document.getElementById('root')!;

root.classList.add(styles.root());

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
