import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useDiveStore } from '../stores/diveStore';
import { useSettingsStore } from '../stores/settingsStore';
import { Diver } from './Diver';
import * as THREE from 'three';

function UnderwaterFog() {
  const depth = useDiveStore((s) => s.depth);
  const fogRef = useRef<THREE.FogExp2>(null);

  useFrame(() => {
    if (fogRef.current) {
      const density = 0.015 + (depth / 50) * 0.06;
      fogRef.current.density = density;
    }
  });

  const wt = useSettingsStore.getState().waterType;
  const fogColor = wt === 'seawater' ? '#0a2a4a' : '#1a3a2a';
  return <fogExp2 ref={fogRef} attach="fog" args={[fogColor, 0.02]} />;
}

function SeaBed() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -40, 0]} receiveShadow>
      <planeGeometry args={[300, 300]} />
      <meshStandardMaterial color="#c9a96e" roughness={0.95} metalness={0.05} />
    </mesh>
  );
}

function WreckPlaceholder() {
  return (
    <group position={[0, -36, -30]}>
      {/* Hull resting on sand at 40m */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[100, 6, 15]} />
        <meshStandardMaterial color="#5a4030" roughness={0.8} metalness={0.3} />
      </mesh>
      {/* Bridge */}
      <mesh position={[20, 5, 0]}>
        <boxGeometry args={[15, 6, 12]} />
        <meshStandardMaterial color="#6a5040" roughness={0.7} metalness={0.4} />
      </mesh>
      {/* Mast */}
      <mesh position={[15, 12, 0]}>
        <cylinderGeometry args={[0.3, 0.5, 16, 8]} />
        <meshStandardMaterial color="#7a6050" roughness={0.6} metalness={0.5} />
      </mesh>
      {/* Deck rail */}
      <mesh position={[0, 3.5, 7]}>
        <boxGeometry args={[80, 0.3, 0.3]} />
        <meshStandardMaterial color="#8a7060" roughness={0.7} metalness={0.5} />
      </mesh>
      <mesh position={[0, 3.5, -7]}>
        <boxGeometry args={[80, 0.3, 0.3]} />
        <meshStandardMaterial color="#8a7060" roughness={0.7} metalness={0.5} />
      </mesh>
    </group>
  );
}

function DepthMarkers() {
  const markers = [5, 10, 15, 20, 25, 30, 35, 40];
  return (
    <group position={[-6, 0, 2]}>
      {markers.map((d) => (
        <group key={d} position={[0, -d, 0]}>
          <mesh>
            <boxGeometry args={[2, 0.03, 0.03]} />
            <meshBasicMaterial color="#00e5ff" transparent opacity={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function DiveLoop() {
  const tick = useDiveStore((s) => s.tick);
  useFrame((_, delta) => {
    tick(delta);
  });
  return null;
}

/** Shared diver position + heading for camera */
export const diverWorldPos = { x: 0, y: 0, z: 0, heading: 0 };

/**
 * Custom camera: follows diver + mouse drag to orbit around.
 * - Left drag = orbit
 * - Scroll = zoom
 * - Camera always keeps diver centered
 */
function CameraRig() {
  const { gl } = useThree();
  const orbitAngle = useRef({ theta: 0, phi: 0.6 }); // horizontal, vertical
  const camDist = useRef(6);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = gl.domElement;

    const onDown = (e: PointerEvent) => {
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      orbitAngle.current.theta -= dx * 0.005;
      orbitAngle.current.phi = Math.max(0.1, Math.min(Math.PI * 0.45, orbitAngle.current.phi + dy * 0.005));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => { isDragging.current = false; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camDist.current = Math.max(3, Math.min(15, camDist.current + e.deltaY * 0.005));
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [gl]);

  useFrame(({ camera }) => {
    const { x, y, z } = diverWorldPos;
    const { theta, phi } = orbitAngle.current;
    const dist = camDist.current;

    // Spherical to cartesian offset from diver
    const camX = x + dist * Math.sin(phi) * Math.sin(theta);
    const camY = y + dist * Math.cos(phi);
    const camZ = z + dist * Math.sin(phi) * Math.cos(theta);

    // Smooth follow
    camera.position.x += (camX - camera.position.x) * 0.08;
    camera.position.y += (camY - camera.position.y) * 0.08;
    camera.position.z += (camZ - camera.position.z) * 0.08;

    camera.lookAt(x, y, z);
  });

  return null;
}

export function UnderwaterScene() {
  const depth = useDiveStore((s) => s.depth);
  const waterType = useSettingsStore((s) => s.waterType);

  // Water color: seawater = blue, freshwater = green
  const isSea = waterType === 'seawater';
  const hue = isSea ? 0.55 : 0.38;       // blue vs green
  const sat = isSea ? 0.6 : 0.5;
  const lightness = Math.max(0.03, 0.18 - depth * 0.004);
  const waterColor = new THREE.Color().setHSL(hue, sat, lightness);

  return (
    <>
      <DiveLoop />
      <CameraRig />
      <UnderwaterFog />

      {/* Lighting — dims with depth but always enough to see diver */}
      <ambientLight intensity={Math.max(0.3, 0.8 - depth * 0.012)} color="#8ecae6" />
      <directionalLight
        position={[5, 30, 10]}
        intensity={Math.max(0.3, 1.2 - depth * 0.02)}
        color="#b0d8ff"
        castShadow
      />
      {/* Diver spotlight — always visible */}
      <pointLight
        position={[diverWorldPos.x, diverWorldPos.y + 2, diverWorldPos.z + 1]}
        intensity={0.8}
        color="#ffffff"
        distance={12}
      />
      {/* Underwater ambient fill from below */}
      <pointLight
        position={[diverWorldPos.x, diverWorldPos.y - 3, diverWorldPos.z]}
        intensity={0.2}
        color="#4fc3f7"
        distance={8}
      />

      {/* Background */}
      <color attach="background" args={[waterColor.r * 0.2, waterColor.g * 0.25, waterColor.b * 0.5]} />

      {/* === THE DIVER === */}
      <Diver />

      {/* Environment */}
      <SeaBed />
      <WreckPlaceholder />
      <DepthMarkers />

      {/* Water surface — visible plane at Y=0 */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial
          color={isSea ? '#2196f3' : '#4caf50'}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Bright light from above surface — sun rays */}
      <directionalLight
        position={[0, 20, 0]}
        intensity={Math.max(0.2, 1.5 - depth * 0.04)}
        color={isSea ? '#87ceeb' : '#a5d6a7'}
      />
    </>
  );
}
