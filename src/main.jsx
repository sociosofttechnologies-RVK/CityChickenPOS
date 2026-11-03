import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { TvScreen } from './Tv.jsx';
import './styles.css';

// Two screens in one app: the till at "/", and the TV screen at "/tv".
const onTv = window.location.pathname.replace(/\/+$/, '') === '/tv';
if (onTv) document.body.classList.add('tv-page');
createRoot(document.getElementById('root')).render(onTv ? <TvScreen standalone /> : <App />);
