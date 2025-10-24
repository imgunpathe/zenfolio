import { REGIONS_CURRENCY } from './constants';

type Region = keyof typeof REGIONS_CURRENCY;

export const formatCurrency = (value: number, region: string) => {
    const safeRegion = region as Region;
    const currencyInfo = REGIONS_CURRENCY[safeRegion] || REGIONS_CURRENCY['US'];

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyInfo.code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};