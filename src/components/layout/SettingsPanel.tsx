import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
import { useSetupStore } from '../../stores/setupStore';
import { useDiveStore } from '../../stores/diveStore';
import { mod } from '../../engine/gas';
import { TANK_PRESETS, GAS_PRESETS } from '../../types';
import type { WaterType } from '../../types';

// ─── Tab definitions ────────────────────────────────────────────
const TABS = [
  { id: 'equipment', label: 'Equipment', icon: '\u2693' },   // anchor
  { id: 'diver', label: 'Diver', icon: '\ud83e\uddcd' },       // person in suit
  { id: 'environment', label: 'Environment', icon: '\ud83c\udf0a' }, // wave
  { id: 'display', label: 'Display', icon: '\ud83d\udcbb' },   // laptop
] as const;

type TabId = (typeof TABS)[number]['id'];

// ─── SAC presets ────────────────────────────────────────────────
const SAC_PRESETS = [
  { label: 'Beginner', sac: 22, color: '#f44336' },
  { label: 'Average', sac: 15, color: '#ffeb3b' },
  { label: 'Experienced', sac: 12, color: '#4caf50' },
  { label: 'Tech', sac: 9, color: '#00e5ff' },
];

// ─── Gas presets for UI ─────────────────────────────────────────
const GAS_PRESET_LIST = [
  { key: 'AIR', ...GAS_PRESETS.AIR },
  { key: 'EAN32', ...GAS_PRESETS.EAN32 },
  { key: 'EAN36', ...GAS_PRESETS.EAN36 },
  { key: 'EAN40', ...GAS_PRESETS.EAN40 },
];

// ─── Skin options ───────────────────────────────────────────────
const SKIN_OPTIONS = [
  { id: 'default', name: 'Educational', brand: 'nScuba', color: '#00e5ff' },
  { id: 'shearwater', name: 'Shearwater', brand: 'Shearwater', color: '#ff6f00' },
  { id: 'garmin', name: 'Garmin', brand: 'Garmin', color: '#8bc34a' },
  { id: 'suunto', name: 'Suunto', brand: 'Suunto', color: '#e91e63' },
];

// ─── Reusable slider component ─────────────────────────────────
function SettingSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  description,
  valueDisplay,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  description?: string;
  valueDisplay?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-sm font-mono text-[var(--cyan-accent)]">
          {valueDisplay ?? `${value}${unit ? ' ' + unit : ''}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--cyan-accent) 0%, var(--cyan-accent) ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`,
        }}
      />
      {description && (
        <p className="text-xs text-gray-500 mt-1 italic">{description}</p>
      )}
    </div>
  );
}

// ─── Section wrapper ────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs tracking-[0.2em] text-[var(--cyan-dim)] uppercase mb-3 border-b border-white/10 pb-1">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Equipment Tab ──────────────────────────────────────────────
function EquipmentTab() {
  const setup = useSetupStore();
  const { waterType, weightKg, setWeightKg } = useSettingsStore();
  const [customO2, setCustomO2] = useState(false);

  const suggestedWeight = waterType === 'seawater' ? 7 : 4;
  const totalGasVolume = setup.startingPressure * setup.tank.volumeL * setup.tank.count;
  const currentMod = mod(setup.gasMix.fo2);

  return (
    <>
      {/* Tank Selection */}
      <Section title="Tank">
        <div className="grid grid-cols-3 gap-2">
          {TANK_PRESETS.map((tank, i) => {
            const isSelected =
              setup.tank.volumeL === tank.volumeL &&
              setup.tank.material === tank.material &&
              setup.tank.count === tank.count;
            return (
              <button
                key={i}
                onClick={() => setup.setTank(tank)}
                className={`p-3 rounded-lg border text-center transition-all ${
                  isSelected
                    ? 'border-[var(--cyan-accent)] bg-[var(--cyan-accent)]/10'
                    : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="text-sm font-mono text-white">{tank.label}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {tank.material === 'aluminum' ? 'Aluminum' : 'Steel'}
                </div>
                <div className="text-[10px] text-gray-500">
                  {tank.weightKg} kg | {tank.volumeL}L
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Weight Belt */}
      <Section title="Weight Belt">
        <SettingSlider
          label="Lead Weight"
          value={weightKg}
          min={0}
          max={15}
          step={0.5}
          unit="kg"
          onChange={setWeightKg}
          description="More weight = sink easier, less weight = float easier"
        />
        <button
          onClick={() => setWeightKg(suggestedWeight)}
          className="text-xs text-[var(--cyan-dim)] border border-[var(--cyan-dim)]/30 px-3 py-1 rounded hover:bg-[var(--cyan-dim)]/10 transition-all"
        >
          Auto-suggest: {suggestedWeight} kg ({waterType})
        </button>
      </Section>

      {/* Gas Mix */}
      <Section title="Gas Mix">
        <div className="grid grid-cols-2 gap-2 mb-3">
          {GAS_PRESET_LIST.map((gas) => {
            const isSelected =
              !customO2 && setup.gasMix.fo2 === gas.fo2;
            return (
              <button
                key={gas.key}
                onClick={() => {
                  setCustomO2(false);
                  setup.setGasMix({ fo2: gas.fo2, fn2: gas.fn2, fhe: gas.fhe, label: gas.label });
                }}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  isSelected
                    ? 'border-[var(--cyan-accent)] bg-[var(--cyan-accent)]/10'
                    : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="text-sm font-mono text-white">{gas.label}</div>
                <div className="text-[10px] text-gray-500">
                  O2: {Math.round(gas.fo2 * 100)}% | MOD: {mod(gas.fo2).toFixed(0)}m
                </div>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setCustomO2(!customO2)}
          className={`text-xs mb-2 px-3 py-1 rounded border transition-all ${
            customO2
              ? 'border-[var(--cyan-accent)] text-[var(--cyan-accent)]'
              : 'border-gray-600 text-gray-400'
          }`}
        >
          Custom O2%
        </button>
        {customO2 && (
          <SettingSlider
            label="Oxygen %"
            value={Math.round(setup.gasMix.fo2 * 100)}
            min={21}
            max={40}
            onChange={(v) => {
              const fo2 = v / 100;
              setup.setGasMix({
                fo2,
                fn2: 1 - fo2,
                fhe: 0,
                label: `EANx${v}`,
              });
            }}
            valueDisplay={`${Math.round(setup.gasMix.fo2 * 100)}% O2 | MOD: ${mod(setup.gasMix.fo2).toFixed(0)}m`}
          />
        )}
        <div className="text-xs text-gray-500 mt-1">
          Current MOD: <span className="text-[var(--cyan-accent)] font-mono">{currentMod.toFixed(1)} m</span>
        </div>
      </Section>

      {/* Starting Pressure */}
      <Section title="Starting Pressure">
        <SettingSlider
          label="Tank Pressure"
          value={setup.startingPressure}
          min={100}
          max={300}
          step={10}
          unit="bar"
          onChange={setup.setStartingPressure}
          description={`Total gas volume: ${totalGasVolume.toLocaleString()} L`}
        />
      </Section>
    </>
  );
}

// ─── Diver Tab ──────────────────────────────────────────────────
function DiverTab() {
  const setup = useSetupStore();
  const [showGF, setShowGF] = useState(false);

  return (
    <>
      {/* SAC Rate */}
      <Section title="SAC Rate (Surface Air Consumption)">
        <div className="grid grid-cols-2 gap-2 mb-3">
          {SAC_PRESETS.map((p) => (
            <button
              key={p.sac}
              onClick={() => setup.setSacRate(p.sac)}
              className={`p-2.5 rounded-lg border text-center transition-all ${
                setup.sacRate === p.sac
                  ? 'border-[var(--cyan-accent)] bg-[var(--cyan-accent)]/10'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="text-sm text-white" style={{ color: p.color }}>
                {p.label}
              </div>
              <div className="text-xs font-mono text-gray-400">{p.sac} L/min</div>
            </button>
          ))}
        </div>
        <SettingSlider
          label="Custom SAC Rate"
          value={setup.sacRate}
          min={8}
          max={30}
          unit="L/min"
          onChange={setup.setSacRate}
          description="Liters of air consumed per minute at the surface"
        />
      </Section>

      {/* Gradient Factors */}
      <Section title="Gradient Factors (Decompression)">
        <button
          onClick={() => setShowGF(!showGF)}
          className={`text-xs mb-3 px-3 py-1.5 rounded border transition-all ${
            showGF
              ? 'border-[var(--cyan-accent)] text-[var(--cyan-accent)]'
              : 'border-gray-600 text-gray-400'
          }`}
        >
          {showGF ? 'Hide Advanced' : 'Show Advanced GF Settings'}
        </button>
        {showGF && (
          <>
            <SettingSlider
              label="GF Low"
              value={setup.gfLow}
              min={20}
              max={100}
              onChange={(v) => setup.setGradientFactors(v, setup.gfHigh)}
              description="Controls when the first deco stop begins"
            />
            <SettingSlider
              label="GF High"
              value={setup.gfHigh}
              min={50}
              max={100}
              onChange={(v) => setup.setGradientFactors(setup.gfLow, v)}
              description="Controls the final ascent ceiling"
            />
            <p className="text-xs text-yellow-500/80 italic">
              Lower GF = more conservative (more deco stops). Default: 40/85
            </p>
          </>
        )}
      </Section>
    </>
  );
}

// ─── Environment Tab ────────────────────────────────────────────
function EnvironmentTab() {
  const { waterType, setWaterType, weightKg, setWeightKg } = useSettingsStore();

  const handleWaterTypeChange = (type: WaterType) => {
    setWaterType(type);
    // Auto-suggest weight
    setWeightKg(type === 'seawater' ? 7 : 4);
  };

  return (
    <>
      <Section title="Water Type">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleWaterTypeChange('seawater')}
            className={`p-4 rounded-lg border text-center transition-all ${
              waterType === 'seawater'
                ? 'border-blue-400 bg-blue-500/10'
                : 'border-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="text-2xl mb-1">{'\ud83c\udf0a'}</div>
            <div className="text-sm font-medium text-white">Seawater</div>
            <div className="text-xs font-mono text-blue-300">1.025 kg/L</div>
            <div className="text-[10px] text-gray-500 mt-1">
              More buoyant, needs more weight
            </div>
          </button>
          <button
            onClick={() => handleWaterTypeChange('freshwater')}
            className={`p-4 rounded-lg border text-center transition-all ${
              waterType === 'freshwater'
                ? 'border-green-400 bg-green-500/10'
                : 'border-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="text-2xl mb-1">{'\ud83c\udf3f'}</div>
            <div className="text-sm font-medium text-white">Freshwater</div>
            <div className="text-xs font-mono text-green-300">1.000 kg/L</div>
            <div className="text-[10px] text-gray-500 mt-1">
              Less buoyant, needs less weight
            </div>
          </button>
        </div>
      </Section>

      <Section title="Water Temperature">
        <div className="text-sm text-gray-400 italic">
          Temperature affects gas consumption and wetsuit compression.
          Currently set to 28 C (auto-calculated based on depth).
        </div>
      </Section>
    </>
  );
}

// ─── Display Tab ────────────────────────────────────────────────
function DisplayTab() {
  const {
    unitSystem,
    setUnitSystem,
    language,
    setLanguage,
    selectedSkin,
    setSelectedSkin,
  } = useSettingsStore();
  const { i18n } = useTranslation('common');

  const handleLangChange = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <>
      {/* Units */}
      <Section title="Units">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setUnitSystem('metric')}
            className={`p-3 rounded-lg border text-center transition-all ${
              unitSystem === 'metric'
                ? 'border-[var(--cyan-accent)] bg-[var(--cyan-accent)]/10'
                : 'border-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="text-sm text-white font-medium">Metric</div>
            <div className="text-[10px] text-gray-500">m, bar, C</div>
          </button>
          <button
            onClick={() => setUnitSystem('imperial')}
            className={`p-3 rounded-lg border text-center transition-all ${
              unitSystem === 'imperial'
                ? 'border-[var(--cyan-accent)] bg-[var(--cyan-accent)]/10'
                : 'border-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="text-sm text-white font-medium">Imperial</div>
            <div className="text-[10px] text-gray-500">ft, PSI, F</div>
          </button>
        </div>
      </Section>

      {/* Language */}
      <Section title="Language">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleLangChange('en')}
            className={`p-3 rounded-lg border text-center transition-all ${
              language === 'en'
                ? 'border-[var(--cyan-accent)] bg-[var(--cyan-accent)]/10'
                : 'border-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="text-sm text-white">English</div>
          </button>
          <button
            onClick={() => handleLangChange('th')}
            className={`p-3 rounded-lg border text-center transition-all ${
              language === 'th'
                ? 'border-[var(--cyan-accent)] bg-[var(--cyan-accent)]/10'
                : 'border-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="text-sm text-white">Thai</div>
          </button>
        </div>
      </Section>

      {/* Dive Computer Skin */}
      <Section title="Dive Computer Skin">
        <div className="grid grid-cols-2 gap-3">
          {SKIN_OPTIONS.map((skin) => (
            <button
              key={skin.id}
              onClick={() => setSelectedSkin(skin.id)}
              className={`p-3 rounded-lg border text-center transition-all ${
                selectedSkin === skin.id
                  ? 'border-[var(--cyan-accent)] bg-[var(--cyan-accent)]/10'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <div
                className="w-full h-12 rounded mb-2 flex items-center justify-center text-xs font-mono"
                style={{
                  background: `linear-gradient(135deg, ${skin.color}22, ${skin.color}44)`,
                  border: `1px solid ${skin.color}66`,
                }}
              >
                {skin.brand}
              </div>
              <div className="text-sm text-white">{skin.name}</div>
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}

// ─── Main SettingsPanel ─────────────────────────────────────────
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>('equipment');
  const setup = useSetupStore();
  const initDive = useDiveStore((s) => s.initDive);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass w-[680px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg tracking-[0.15em] text-white font-light">
            DIVE SETTINGS
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-xl transition-colors px-2"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-xs tracking-wider transition-all ${
                activeTab === tab.id
                  ? 'text-[var(--cyan-accent)] border-b-2 border-[var(--cyan-accent)] bg-[var(--cyan-accent)]/5'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
          {activeTab === 'equipment' && <EquipmentTab />}
          {activeTab === 'diver' && <DiverTab />}
          {activeTab === 'environment' && <EnvironmentTab />}
          {activeTab === 'display' && <DisplayTab />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-gray-600 text-gray-400 text-sm hover:border-gray-400 hover:text-gray-200 transition-all"
          >
            Back to Menu
          </button>
          <button
            onClick={handleStartDive}
            className="px-8 py-2.5 rounded-lg bg-[var(--cyan-accent)] text-[var(--ocean-deep)] text-sm font-semibold tracking-wider hover:brightness-110 transition-all shadow-lg shadow-[var(--cyan-accent)]/20"
          >
            START DIVE
          </button>
        </div>
      </div>
    </div>
  );
}
