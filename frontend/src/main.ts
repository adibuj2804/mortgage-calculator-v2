import './styles/main.css';
import { createApiClient } from './api/client';
import { getClientId } from './identity';
import { mountCalculator } from './ui/form';

const app = document.getElementById('app');
if (!app) throw new Error('Missing #app element');

const api = createApiClient(import.meta.env.VITE_API_URL ?? 'http://localhost:8000');
mountCalculator(app, api, getClientId());
