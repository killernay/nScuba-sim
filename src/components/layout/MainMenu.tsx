import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDiveStore } from '../../stores/diveStore';
import { useSetupStore } from '../../stores/setupStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { SettingsPanel } from './SettingsPanel';

export function MainMenu() {
  const { t, i18n } = useTranslation('common');
  const initDive = useDiveStore((s) => s.initDive);
  const setup = useSetupStore();
  const { language, setLanguage } = useSettingsStore();
  const [showSettings, setShowSettings] = useState(false);

  const handleStartDive = () => {
    initDive({
      tankPressure: setup.startingPressure,
      cylinderVolumeL: setup.tank.volumeL * setup.tank.count,
      gasMix: setup.gasMix,
      sacRate: setup.sacRate,
      gfLow: setup.gfLow,
      gfHigh: setup.gfHigh,
    });
  };

  const toggleLang = () => {
    const next = language === 'en' ? 'th' : 'en';
    setLanguage(next);
    i18n.changeLanguage(next);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--ocean-deep)]">
      {/* Title */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-light tracking-[0.3em] text-white mb-2">
          nSCUBA SIM
        </h1>
        <div className="flex items-center gap-4 justify-center mb-3">
          <div className="w-24 h-px bg-[var(--cyan-accent)] opacity-40" />
          <h2 className="text-2xl tracking-[0.4em] text-[var(--cyan-accent)] opacity-90">
            HARDEEP
          </h2>
          <div className="w-24 h-px bg-[var(--cyan-accent)] opacity-40" />
        </div>
        <p className="text-sm text-[var(--cyan-dim)] opacity-60">
          {t('tagline')}
        </p>
      </div>

      {/* Navigation Cards */}
      <div className="flex gap-6 mb-16">
        <MenuCard
          icon="🤿"
          label={t('menu.dive')}
          active
          onClick={handleStartDive}
        />
        <MenuCard icon="📋" label={t('menu.diveLog')} />
        <MenuCard icon="📖" label={t('menu.learn')} />
        <MenuCard
          icon="⚙️"
          label={t('menu.settings')}
          active
          onClick={() => setShowSettings(true)}
        />
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#060e1a]/80 flex items-center px-8 justify-between">
        <div className="flex gap-2">
          <button
            onClick={toggleLang}
            className={`px-4 py-2 rounded-lg text-sm font-mono transition-all ${
              language === 'en'
                ? 'border border-[var(--cyan-accent)] text-[var(--cyan-accent)]'
                : 'border border-gray-600 text-gray-500'
            }`}
          >
            EN
          </button>
          <button
            onClick={toggleLang}
            className={`px-4 py-2 rounded-lg text-sm font-mono transition-all ${
              language === 'th'
                ? 'border border-[var(--cyan-accent)] text-[var(--cyan-accent)]'
                : 'border border-gray-600 text-gray-500'
            }`}
          >
            TH
          </button>
        </div>
        <span className="text-xs text-gray-600">v0.1 | nScuba Team</span>
      </div>

      {/* Settings Modal */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function MenuCard({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`glass w-44 h-52 flex flex-col items-center justify-center gap-4 transition-all hover:scale-105 ${
        active
          ? 'border-[var(--cyan-accent)] hover:shadow-[0_0_20px_rgba(0,229,255,0.2)]'
          : 'opacity-50 cursor-not-allowed'
      }`}
    >
      <span className="text-4xl">{icon}</span>
      <span className="text-sm tracking-widest text-white">{label}</span>
    </button>
  );
}
