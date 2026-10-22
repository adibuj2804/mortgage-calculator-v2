import './styles/main.css';
import { mountCalculator } from './ui/form';

const app = document.getElementById('app');
if (!app) throw new Error('Missing #app element');

mountCalculator(app);
