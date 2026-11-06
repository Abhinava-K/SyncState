import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, Float } from '@react-three/drei';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Procedural Spur Gear Geometry Generator (THREE.Shape + ExtrudeGeometry)
// ---------------------------------------------------------------------------
function createGearShape(
  teeth: number,
  module: number,
  innerRadius: number,
  spokeCount: number = 5
): THREE.Shape {
  const pitchRadius = (teeth * module) / 2;
  const addendum = module * 0.82;
  const dedendum = module * 0.95;
  const outerRadius = pitchRadius + addendum;
  const rootRadius = pitchRadius - dedendum;

  const shape = new THREE.Shape();
  const anglePerStep = (Math.PI * 2) / teeth;

  for (let i = 0; i < teeth; i++) {
    const baseAngle = i * anglePerStep;
    // Trapezoidal tooth profile for authentic involute gear look
    const a0 = baseAngle;
    const a1 = baseAngle + anglePerStep * 0.22;
    const a2 = baseAngle + anglePerStep * 0.46;
    const a3 = baseAngle + anglePerStep * 0.68;

    const p0 = [Math.cos(a0) * rootRadius, Math.sin(a0) * rootRadius];
    const p1 = [Math.cos(a1) * outerRadius, Math.sin(a1) * outerRadius];
    const p2 = [Math.cos(a2) * outerRadius, Math.sin(a2) * outerRadius];
    const p3 = [Math.cos(a3) * rootRadius, Math.sin(a3) * rootRadius];

    if (i === 0) {
      shape.moveTo(p0[0], p0[1]);
    } else {
      shape.lineTo(p0[0], p0[1]);
    }
    shape.lineTo(p1[0], p1[1]);
    shape.lineTo(p2[0], p2[1]);
    shape.lineTo(p3[0], p3[1]);
  }
  shape.closePath();

  // Central Axle Bore hole
  const boreRadius = innerRadius * 0.52;
  const boreHole = new THREE.Path();
  boreHole.absarc(0, 0, boreRadius, 0, Math.PI * 2, true);
  shape.holes.push(boreHole);

  // Precision architectural cutouts/spokes
  if (spokeCount > 0 && rootRadius > innerRadius * 1.45) {
    const cutoutInner = innerRadius * 0.85;
    const cutoutOuter = rootRadius * 0.72;
    const spokeAngle = (Math.PI * 2) / spokeCount;
    const windowSpan = spokeAngle * 0.62;

    for (let s = 0; s < spokeCount; s++) {
      const startAngle = s * spokeAngle + spokeAngle * 0.19;
      const endAngle = startAngle + windowSpan;
      const hole = new THREE.Path();
      hole.absarc(0, 0, cutoutOuter, startAngle, endAngle, false);
      hole.absarc(0, 0, cutoutInner, endAngle, startAngle, true);
      hole.closePath();
      shape.holes.push(hole);
    }
  }

  return shape;
}

// ---------------------------------------------------------------------------
// Single Gear Component with Machined Hub & Obsidian PBR Material
// ---------------------------------------------------------------------------
interface GearMeshProps {
  teeth: number;
  module: number;
  thickness?: number;
  innerRadius?: number;
  spokeCount?: number;
  position?: [number, number, number];
  rotationZ?: number;
  gearRef?: React.RefObject<THREE.Group>;
}

const GearMesh: React.FC<GearMeshProps> = ({
  teeth,
  module,
  thickness = 0.22,
  innerRadius = 0.8,
  spokeCount = 5,
  position = [0, 0, 0],
  gearRef,
}) => {
  const shape = useMemo(
    () => createGearShape(teeth, module, innerRadius, spokeCount),
    [teeth, module, innerRadius, spokeCount]
  );

  const extrudeSettings = useMemo(
    () => ({
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.024,
      bevelSegments: 4,
      curveSegments: 36,
    }),
    [thickness]
  );

  const geometry = useMemo(() => new THREE.ExtrudeGeometry(shape, extrudeSettings), [shape, extrudeSettings]);

  // Center the geometry along the Z axis
  useMemo(() => {
    geometry.center();
  }, [geometry]);

  const hubRadius = innerRadius * 0.65;
  const hubThickness = thickness * 1.4;

  return (
    <group ref={gearRef} position={position}>
      {/* Main Extruded Beveled Gear Profile */}
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#0c0d11"
          metalness={0.93}
          roughness={0.16}
          clearcoat={0.65}
          clearcoatRoughness={0.12}
          reflectivity={1.0}
        />
      </mesh>

      {/* Central Machined Axle Hub / Collar */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[hubRadius, hubRadius, hubThickness, 32]} />
        <meshPhysicalMaterial
          color="#161821"
          metalness={0.96}
          roughness={0.12}
          clearcoat={0.8}
          clearcoatRoughness={0.08}
        />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// 4-Gear Coupled Kinematic System
// ---------------------------------------------------------------------------
interface GearSystemProps {
  mousePos: { x: number; y: number };
  xOffset?: number;
  scale?: number;
}

const GearSystem: React.FC<GearSystemProps> = ({ mousePos, xOffset = 0.2, scale = 0.85 }) => {
  const systemRef = useRef<THREE.Group>(null);
  const gear1Ref = useRef<THREE.Group>(null);
  const gear2Ref = useRef<THREE.Group>(null);
  const gear3Ref = useRef<THREE.Group>(null);
  const gear4Ref = useRef<THREE.Group>(null);

  // System Configuration (Module = 0.17)
  const m = 0.17;
  const N1 = 22; // Gear 1: Primary Drive Gear (Center)
  const N2 = 16; // Gear 2: Bottom-Left Counter-Gear
  const N3 = 16; // Gear 3: Top Gear (Fully shown, zero cutoffs)
  const N4 = 11; // Gear 4: Smaller 4th Gear directly under top 3rd gear

  const R1 = (N1 * m) / 2; // 1.87
  const R2 = (N2 * m) / 2; // 1.36
  const R3 = (N3 * m) / 2; // 1.36
  const R4 = (N4 * m) / 2; // 0.935

  // Placement Angles
  // Gear 2: Meshed to Gear 1 at bottom-left (-135°)
  const alpha2 = -Math.PI * 0.75;
  const D12 = R1 + R2; // 3.23
  const pos2: [number, number, number] = [Math.cos(alpha2) * D12, Math.sin(alpha2) * D12, 0];

  // Gear 3: Meshed to Gear 1 at top-right (58°)
  const alpha3 = (58 * Math.PI) / 180;
  const D13 = R1 + R3; // 3.23
  const pos3: [number, number, number] = [Math.cos(alpha3) * D13, Math.sin(alpha3) * D13, 0];

  // Gear 4: Smaller 4th gear meshed to Gear 3 on its underside (-54° relative to Gear 3)
  const beta4 = (-54 * Math.PI) / 180;
  const D34 = R3 + R4; // 2.295
  const pos4: [number, number, number] = [
    pos3[0] + Math.cos(beta4) * D34,
    pos3[1] + Math.sin(beta4) * D34,
    0,
  ];

  // Steady accumulated time ref to completely eliminate tab-switch delta explosions
  const timeRef = useRef(0);

  // Kinematic loop with Exact Phase Alignment Formula & Tab-Switch Safe Damping
  useFrame((_, delta) => {
    // 1. Clamp delta to max 50ms (prevents huge time jumps when tab is restored)
    const safeDelta = Math.min(delta, 0.05);
    timeRef.current += safeDelta;
    const t = timeRef.current;

    const speed = 0.45;
    const theta1 = t * speed;

    // Golden Phase Alignment Formula:
    // theta_child = alpha + PI + (PI / N_child) - (N_parent / N_child) * (theta_parent - alpha)
    const theta2 = alpha2 + Math.PI + Math.PI / N2 - (N1 / N2) * (theta1 - alpha2);
    const theta3 = alpha3 + Math.PI + Math.PI / N3 - (N1 / N3) * (theta1 - alpha3);
    const theta4 = beta4 + Math.PI + Math.PI / N4 - (N3 / N4) * (theta3 - beta4);

    if (gear1Ref.current) gear1Ref.current.rotation.z = theta1;
    if (gear2Ref.current) gear2Ref.current.rotation.z = theta2;
    if (gear3Ref.current) gear3Ref.current.rotation.z = theta3;
    if (gear4Ref.current) gear4Ref.current.rotation.z = theta4;

    // 2. Whole-system 3D Gimbal Tumble & Mouse-Parallax with frame-rate independent exponential damp
    if (systemRef.current) {
      const targetRotX = 0.38 + Math.sin(t * 0.26) * 0.12 + mousePos.y * 0.14;
      const targetRotY = -0.42 + Math.cos(t * 0.20) * 0.14 + mousePos.x * 0.15;
      const targetRotZ = Math.sin(t * 0.14) * 0.06;

      // Exponential decay factor (guaranteed 0 < factor < 1, mathematically never overshoots)
      const lerpFactor = 1 - Math.exp(-6 * safeDelta);

      systemRef.current.rotation.x = THREE.MathUtils.lerp(systemRef.current.rotation.x, targetRotX, lerpFactor);
      systemRef.current.rotation.y = THREE.MathUtils.lerp(systemRef.current.rotation.y, targetRotY, lerpFactor);
      systemRef.current.rotation.z = THREE.MathUtils.lerp(systemRef.current.rotation.z, targetRotZ, lerpFactor);
    }
  });

  return (
    // =========================================================================
    // HORIZONTAL SPACING & CENTERING:
    // - Shifted by exactly -0.70 units (-50px) to cut 50px from the left gap
    //   and append 50px of breathing room to the right of the gears.
    // - `scale`: overall size of the 4-gear mechanical system
    // - `xOffset`: optional horizontal fine-tuning
    // =========================================================================
    <group ref={systemRef} scale={scale} position={[xOffset - 0.70, -0.25, 0]}>
      {/* Gear 1: Primary Center Drive Gear */}
      <GearMesh teeth={N1} module={m} innerRadius={1.05} spokeCount={6} position={[0, 0, 0]} gearRef={gear1Ref} />
      {/* Gear 2: Bottom-Left Driven Gear */}
      <GearMesh teeth={N2} module={m} innerRadius={0.72} spokeCount={4} position={pos2} gearRef={gear2Ref} />
      {/* Gear 3: Top-Right Driven Gear (Fully visible, zero cutoffs) */}
      <GearMesh teeth={N3} module={m} innerRadius={0.72} spokeCount={5} position={pos3} gearRef={gear3Ref} />
      {/* Gear 4: Smaller 4th Gear nestled right under top 3rd gear */}
      <GearMesh teeth={N4} module={m} innerRadius={0.52} spokeCount={3} position={pos4} gearRef={gear4Ref} />
    </group>
  );
};

// ---------------------------------------------------------------------------
// Exported Responsive Canvas Container
// ---------------------------------------------------------------------------
export interface HeroGearCanvasProps {
  xOffset?: number;
  scale?: number;
  width?: string | number;
  height?: string | number;
}

export const HeroGearCanvas: React.FC<HeroGearCanvasProps> = ({
  xOffset = 0,
  scale = 0.95,
  width,
  height,
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    // Wide canvas container with zero border cutoffs
    <div
      style={{
        width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
      }}
      className="relative w-[580px] max-w-[95vw] h-[540px] sm:h-[620px] lg:h-[680px] flex items-center justify-center select-none pointer-events-auto"
    >
      {/* Subtle Radial Glow directly centered behind the 3D mechanism */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] bg-gradient-to-tr from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none rounded-full" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(255,255,255,0.04)_0%,transparent_70%)] pointer-events-none rounded-full" />

      {/* Generous camera frustum (fov 46, z = 11.2) guarantees zero border cutoffs at all scale levels */}
      <Canvas
        camera={{ position: [0, 0, 11.2], fov: 46 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        className="w-full h-full"
      >
        <ambientLight intensity={0.45} />

        {/* Directional Rim Lights to catch beveled edges against pure black */}
        <directionalLight position={[8, 12, 6]} intensity={2.2} color="#ffffff" />
        <directionalLight position={[-10, -6, -4]} intensity={2.4} color="#94a3b8" />
        <directionalLight position={[0, -8, 8]} intensity={1.2} color="#a5b4fc" />

        {/* Studio HDRI Environment with Specular Lightformer Strips */}
        <Environment resolution={512}>
          {/* Top key lightformer */}
          <Lightformer intensity={4} rotation-x={Math.PI / 2} position={[0, 6, -8]} scale={[12, 12, 1]} />
          {/* Side grazing lightformers */}
          <Lightformer intensity={3} rotation-y={Math.PI / 2} position={[-6, 1, -2]} scale={[14, 3, 1]} color="#ffffff" />
          <Lightformer intensity={2.5} rotation-y={-Math.PI / 2} position={[8, 1, 1]} scale={[18, 3, 1]} color="#cbd5e1" />
          {/* Cool accent fill */}
          <Lightformer intensity={3.5} color="#818cf8" position={[0, -4, 6]} scale={[10, 4, 1]} />
        </Environment>

        <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.3}>
          <GearSystem mousePos={mousePos} xOffset={xOffset} scale={scale} />
        </Float>
      </Canvas>
    </div>
  );
};

