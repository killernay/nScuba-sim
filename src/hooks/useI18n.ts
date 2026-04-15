import { useTranslation } from 'react-i18next';

export const useI18n = (ns?: string | string[]) => useTranslation(ns);
