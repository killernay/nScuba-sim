import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDiveStore } from '../stores/diveStore';
import { keys } from '../input';
import { diverWorldPos } from './UnderwaterScene';

export function Diver() {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const posX = useRef(0);
  const posZ = useRef(0);
  const heading = useRef(Math.PI); // start facing camera (toward -Z)
  const swimSpeed = useRef(0); // current swim velocity

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const depth = useDiveStore.getState().depth;
    const ascentRate = useDiveStore.getState().ascentRate;
    timeRef.current += delta;

    // Movement
    const accel = 4 * delta;
    const turnSpeed = 2 * delta;
    let isSwimming = false;

    // W = swim forward in facing direction
    if (keys.has('w')) {
      swimSpeed.current = Math.min(swimSpeed.current + accel, 4);
      isSwimming = true;
    }
    // S = swim backward
    else if (keys.has('s')) {
      swimSpeed.current = Math.max(swimSpeed.current - accel, -2);
      isSwimming = true;
    }
    // Decelerate when no W/S
    else {
      swimSpeed.current *= 0.95;
      if (Math.abs(swimSpeed.current) < 0.01) swimSpeed.current = 0;
    }

    // A/D = turn
    if (keys.has('a') || keys.has('left')) {
      heading.current += turnSpeed;
      isSwimming = true;
    }
    if (keys.has('d') || keys.has('right')) {
      heading.current -= turnSpeed;
      isSwimming = true;
    }

    // Apply movement in heading direction
    posX.current += Math.sin(heading.current) * swimSpeed.current * delta;
    posZ.current += Math.cos(heading.current) * swimSpeed.current * delta;

    // Check ascending/descending
    const isVertical = keys.has(' ') || keys.has('shift') ||
                       keys.has('up') || keys.has('down');
    if (isVertical) isSwimming = true;

    // Position — offset so water line hits chest at depth=0
    const surfaceOffset = -0.6;
    const yPos = Math.max(-39.5, -depth + surfaceOffset); // never below seabed
    groupRef.current.position.set(posX.current, yPos, posZ.current);
    diverWorldPos.x = posX.current;
    diverWorldPos.y = yPos;
    diverWorldPos.z = posZ.current;
    diverWorldPos.heading = heading.current;

    // Rotation — dynamic tilt based on what diver is doing
    // positive X rotation = lean forward (head down), negative = lean back
    const speed = Math.abs(swimSpeed.current);
    const swimTilt = Math.min(speed / 4, 1) * 1.0; // lean forward when swimming (max ~60°)
    const verticalTilt = ascentRate > 2 ? -0.3 : ascentRate < -2 ? 0.4 : 0; // ascending = lean back, descending = lean forward
    const idleTilt = 0.15; // slight forward lean at rest
    const targetTilt = isSwimming ? swimTilt + verticalTilt : idleTilt;

    groupRef.current.rotation.order = 'YXZ';
    groupRef.current.rotation.y = heading.current;
    groupRef.current.rotation.x += (targetTilt - groupRef.current.rotation.x) * 0.06;

    // Roll only when turning — reset to 0 when straight
    const turnInput = (keys.has('a') || keys.has('left') ? 1 : 0) -
                      (keys.has('d') || keys.has('right') ? 1 : 0);
    const targetRoll = turnInput * 0.15;
    groupRef.current.rotation.z += (targetRoll - groupRef.current.rotation.z) * 0.1;

    // Idle sway when hovering
    if (!isSwimming && speed < 0.1) {
      groupRef.current.position.y += Math.sin(timeRef.current * 0.5) * 0.03;
      groupRef.current.rotation.z = Math.sin(timeRef.current * 0.3) * 0.03;
    }
  });

  return (
    <group ref={groupRef}>
      {/*
        Character is modeled UPRIGHT here.
        The parent group rotation handles horizontal trim.
      */}

      {/* HEAD */}
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshStandardMaterial color="#f5a623" roughness={0.6} />
      </mesh>
      {/* Mask visor */}
      <mesh position={[0, 1.15, 0.35]}>
        <sphereGeometry args={[0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshPhysicalMaterial color="#40c4ff" transparent opacity={0.45} roughness={0.05} metalness={0.1} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.1, 1.18, 0.4]}><sphereGeometry args={[0.06, 8, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
      <mesh position={[0.1, 1.18, 0.4]}><sphereGeometry args={[0.06, 8, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
      <mesh position={[-0.1, 1.18, 0.45]}><sphereGeometry args={[0.03, 6, 6]} /><meshBasicMaterial color="#1a1a2e" /></mesh>
      <mesh position={[0.1, 1.18, 0.45]}><sphereGeometry args={[0.03, 6, 6]} /><meshBasicMaterial color="#1a1a2e" /></mesh>
      {/* Mask strap */}
      <mesh position={[0, 1.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.43, 0.02, 6, 24]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Regulator */}
      <mesh position={[0.22, 0.95, 0.25]} rotation={[0.6, 0, 0.3]}>
        <cylinderGeometry args={[0.015, 0.015, 0.5, 6]} />
        <meshStandardMaterial color="#ffeb3b" roughness={0.4} />
      </mesh>

      {/* BODY */}
      <mesh position={[0, 0.45, 0]}>
        <capsuleGeometry args={[0.25, 0.4, 8, 16]} />
        <meshStandardMaterial color="#e65100" roughness={0.7} />
      </mesh>
      {/* BCD */}
      <mesh position={[0, 0.55, 0.12]}>
        <boxGeometry args={[0.48, 0.38, 0.15]} />
        <meshStandardMaterial color="#37474f" roughness={0.6} />
      </mesh>

      {/* TANK */}
      <mesh position={[0, 0.5, -0.25]}>
        <capsuleGeometry args={[0.11, 0.5, 8, 12]} />
        <meshStandardMaterial color="#78909c" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.85, -0.25]}>
        <cylinderGeometry args={[0.06, 0.04, 0.08, 8]} />
        <meshStandardMaterial color="#b0bec5" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.92, -0.25]}>
        <boxGeometry args={[0.13, 0.04, 0.09]} />
        <meshStandardMaterial color="#ffd54f" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* ARMS */}
      <Arm side="left" timeRef={timeRef} />
      <Arm side="right" timeRef={timeRef} />

      {/* LEGS + FINS */}
      <Leg side="left" timeRef={timeRef} />
      <Leg side="right" timeRef={timeRef} />

      {/* BUBBLES */}
      <DiverBubbles />
    </group>
  );
}

function Arm({ side, timeRef }: { side: 'left' | 'right'; timeRef: React.MutableRefObject<number> }) {
  const ref = useRef<THREE.Group>(null);
  const sign = side === 'left' ? -1 : 1;

  useFrame(() => {
    if (!ref.current) return;
    const swimming = keys.has('w') || keys.has('s');
    if (swimming) {
      ref.current.rotation.x = Math.sin(timeRef.current * 3 + (side === 'left' ? 0 : Math.PI)) * 0.2;
    } else {
      ref.current.rotation.x += (0.2 - ref.current.rotation.x) * 0.05; // arms slightly forward at rest
    }
  });

  return (
    <group ref={ref} position={[sign * 0.32, 0.5, 0.05]} rotation={[0.2, 0, sign * 0.35]}>
      <mesh><capsuleGeometry args={[0.065, 0.28, 6, 8]} /><meshStandardMaterial color="#e65100" roughness={0.7} /></mesh>
      <mesh position={[0, -0.22, 0]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color="#ffccbc" roughness={0.8} /></mesh>
      {side === 'right' && (
        <mesh position={[0.03, -0.16, 0.05]}><boxGeometry args={[0.07, 0.04, 0.04]} /><meshStandardMaterial color="#1a1a2e" roughness={0.3} /></mesh>
      )}
    </group>
  );
}

function Leg({ side, timeRef }: { side: 'left' | 'right'; timeRef: React.MutableRefObject<number> }) {
  const legRef = useRef<THREE.Group>(null);
  const finRef = useRef<THREE.Mesh>(null);
  const offset = side === 'left' ? 0 : Math.PI;
  const sign = side === 'left' ? -1 : 1;

  useFrame(() => {
    if (!legRef.current || !finRef.current) return;
    const swimming = keys.has('w') || keys.has('s') ||
                     keys.has(' ') || keys.has('shift');
    const kickSpeed = swimming ? 6 : 2.5;
    const kickAmp = swimming ? 0.45 : 0.12;
    legRef.current.rotation.x = Math.sin(timeRef.current * kickSpeed + offset) * kickAmp;
    finRef.current.rotation.x = Math.sin(timeRef.current * kickSpeed + offset + 0.5) * 0.35;
  });

  return (
    <group ref={legRef} position={[sign * 0.12, -0.05, 0]}>
      <mesh><capsuleGeometry args={[0.075, 0.32, 6, 8]} /><meshStandardMaterial color="#e65100" roughness={0.7} /></mesh>
      <mesh ref={finRef} position={[0, -0.32, 0.15]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.13, 0.04, 0.4]} />
        <meshStandardMaterial color="#00e5ff" transparent opacity={0.8} roughness={0.4} />
      </mesh>
    </group>
  );
}

function DiverBubbles() {
  const ref = useRef<THREE.Points>(null);
  const count = 25;
  const posArr = useRef<Float32Array | null>(null);

  if (!posArr.current) {
    posArr.current = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      posArr.current[i * 3] = (Math.random() - 0.5) * 0.2;
      posArr.current[i * 3 + 1] = 1.0 + Math.random() * 3;
      posArr.current[i * 3 + 2] = 0.3 + Math.random() * 0.1;
    }
  }

  useFrame((_, delta) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      pos.array[i * 3 + 1] += delta * (0.4 + Math.random() * 0.3);
      pos.array[i * 3] += Math.sin(Date.now() * 0.004 + i * 2) * 0.003;
      if (pos.array[i * 3 + 1] > 5) {
        pos.array[i * 3 + 1] = 1.0;
        pos.array[i * 3] = (Math.random() - 0.5) * 0.2;
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={posArr.current!} itemSize={3} args={[posArr.current!, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#80d8ff" size={0.1} transparent opacity={0.5} sizeAttenuation depthWrite={false} />
    </points>
  );
}
