import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useDiveStore } from './stores/diveStore';
import { MainMenu } from './components/layout/MainMenu';
import { DiveComputer } from './components/hud/DiveComputer';
import { PostDiveAnalysis } from './components/postdive/PostDiveAnalysis';
import { UnderwaterScene } from './scene/UnderwaterScene';
import { useControls } from './hooks/useControls';
import { useTranslation } from 'react-i18next';

export default function App() {
  const phase = useDiveStore((s) => s.phase);
  const { t } = useTranslation('common');

  useControls();
  const isInDive = !['setup', 'predive', 'postdive'].includes(phase);

  return (
    <div className="w-full h-full relative" tabIndex={0}>
      {phase === 'setup' && <MainMenu />}

      {isInDive && (
        <>
          <Canvas
            className="absolute inset-0"
            camera={{ position: [0, 2, 8], fov: 60 }}
            gl={{ antialias: true, alpha: false }}
          >
            <Suspense fallback={null}>
              <UnderwaterScene />
            </Suspense>
          </Canvas>

          <div className="absolute inset-0 pointer-events-none z-10">
            <DiveComputer />
          </div>
        </>
      )}

      {phase === 'postdive' && <PostDiveAnalysis />}
    </div>
  );
}
