import { ThemeClasses } from './types';

export const REGIONS = ['India', 'US', 'Europe', 'Japan'];

export const REGIONS_CURRENCY = {
    'India': { code: 'INR', symbol: '₹' },
    'US': { code: 'USD', symbol: '$' },
    'Europe': { code: 'EUR', symbol: '€' },
    'Japan': { code: 'JPY', symbol: '¥' },
};

export const VIEWS = {
    DASHBOARD: 'Dashboard',
    STOCKS: 'Stocks',
    MUTUAL_FUNDS: 'Mutual Funds',
} as const;

export const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    DIM: 'dim',
} as const;

export const CATEGORIES = ['Equity', 'Debt', 'Hybrid', 'Other'];

export const TIME_RANGES = ['1m', '6m', '1y', 'All'];

export const themeClasses: { [key: string]: ThemeClasses } = {
    light: {
        bg: 'bg-gray-100 text-gray-900',
        card: 'bg-white/80 backdrop-blur-sm border border-gray-200/80 shadow-subtle',
        nav: 'bg-white/70 backdrop-blur-lg border-b border-gray-200/80',
        buttonActive: 'bg-indigo-600 text-white shadow-md',
        buttonInactive: 'text-gray-500 hover:bg-gray-200/60 hover:text-gray-800',
        tableHeader: 'bg-gray-200/60',
    },
    dark: {
        bg: 'bg-gray-950 text-gray-100',
        card: 'bg-gray-900/80 backdrop-blur-sm border border-white/10 shadow-subtle-dark',
        nav: 'bg-gray-950/70 backdrop-blur-lg border-b border-white/10',
        buttonActive: 'bg-indigo-600 text-white shadow-md',
        buttonInactive: 'text-gray-400 hover:bg-white/10 hover:text-white',
        tableHeader: 'bg-white/5',
    },
    dim: {
        bg: 'bg-slate-800 text-slate-200',
        card: 'bg-slate-700/80 backdrop-blur-sm border border-white/10 shadow-subtle-dark',
        nav: 'bg-slate-900/70 backdrop-blur-lg border-b border-white/10',
        buttonActive: 'bg-indigo-500 text-white shadow-md',
        buttonInactive: 'text-slate-300 hover:bg-white/10 hover:text-white',
        tableHeader: 'bg-white/5',
    }
};