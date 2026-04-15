import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English
import commonEn from './locales/en/common.json';
import diveEn from './locales/en/dive.json';
import gasEn from './locales/en/gas.json';
import bwrafEn from './locales/en/bwraf.json';
import computerEn from './locales/en/computer.json';
import tutorialEn from './locales/en/tutorial.json';

// Thai
import commonTh from './locales/th/common.json';
import diveTh from './locales/th/dive.json';
import gasTh from './locales/th/gas.json';
import bwrafTh from './locales/th/bwraf.json';
import computerTh from './locales/th/computer.json';
import tutorialTh from './locales/th/tutorial.json';

const resources = {
  en: {
    common: commonEn,
    dive: diveEn,
    gas: gasEn,
    bwraf: bwrafEn,
    computer: computerEn,
    tutorial: tutorialEn,
  },
  th: {
    common: commonTh,
    dive: diveTh,
    gas: gasTh,
    bwraf: bwrafTh,
    computer: computerTh,
    tutorial: tutorialTh,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  ns: ['common', 'dive', 'gas', 'bwraf', 'computer', 'tutorial'],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
