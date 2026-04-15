import { useRef, useEffect, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
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

function WreckModels() {
  const { scene: planeWreck } = useGLTF('/models/japanese_zero_plane_wreck.glb');

  return (
    <group>
      {/* Japanese Zero plane wreck on seabed */}
      <primitive object={planeWreck.clone()} position={[15, -38, -20]} scale={[0.3, 0.3, 0.3]} />
    </group>
  );
}

function WhaleShark() {
  const { scene, animations } = useGLTF('/models/whale_shark.glb');
  const ref = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  useEffect(() => {
    if (animations.length > 0) {
      const mixer = new THREE.AnimationMixer(scene);
      mixer.clipAction(animations[0]).play();
      mixerRef.current = mixer;
    }
  }, [animations, scene]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    mixerRef.current?.update(delta);

    // Swim around the plane wreck (at position [15, -38, -20])
    const time = Date.now() * 0.00015; // slow graceful swim
    const radius = 25;
    const centerX = 15;  // plane wreck X
    const centerZ = -20; // plane wreck Z
    ref.current.position.x = centerX + Math.sin(time) * radius;
    ref.current.position.z = centerZ + Math.cos(time) * radius;
    ref.current.position.y = -18 + Math.sin(time * 1.5) * 2.5; // 15-20m depth

    // Face direction of movement (tangent to circle)
    ref.current.rotation.y = -time + Math.PI / 2;
  });

  return (
    <group ref={ref}>
      <primitive object={scene} scale={[0.3, 0.3, 0.3]} />
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
      <Suspense fallback={null}>
        <Diver />
      </Suspense>

      {/* Environment */}
      <SeaBed />
      <Suspense fallback={null}>
        <WreckModels />
        <WhaleShark />
      </Suspense>
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

// diver uses primitives — no GLB needed
useGLTF.preload('/models/japanese_zero_plane_wreck.glb');
// ship wreck removed — too heavy (58MB)
useGLTF.preload('/models/whale_shark.glb');
