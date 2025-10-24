import { VIEWS, THEMES } from './constants';

export type View = typeof VIEWS[keyof typeof VIEWS];
export type Theme = typeof THEMES[keyof typeof THEMES];

export interface BaseEntry {
    id: string;
    user_id: string;
    created_at: string;
    name: string;
    region: string;
    operation: 'buy' | 'sell';
}

export interface StockEntry extends BaseEntry {
    type: 'stock';
    price: number;
    quantity: number;
}

export interface MutualFundEntry extends BaseEntry {
    type: 'mf';
    units: number;
    nav: number;
    amount: number;
    category: string;
}

export type FinancialEntry = StockEntry | MutualFundEntry;

export interface ThemeClasses {
    bg: string;
    card: string;
    nav: string;
    buttonActive: string;
    buttonInactive: string;
    tableHeader: string;
}