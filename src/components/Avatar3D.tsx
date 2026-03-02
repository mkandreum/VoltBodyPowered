import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';

function HumanAvatar({ config, gender }: { config: { muscleMass: number; bodyFat: number }, gender: string }) {
  const group = useRef<THREE.Group>(null);
  const isFemale = gender === 'Femenino';

  useFrame(() => {
    if (group.current) {
      // Use performance.now() to avoid THREE.Clock deprecation warning
      const time = performance.now() / 1000;
      group.current.rotation.y = Math.sin(time * 0.5) * 0.2;
    }
  });

  useEffect(() => {
    return () => {
      // Cleanup geometries and materials on unmount to prevent context loss
      if (group.current) {
        group.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      }
    };
  }, []);

  // Colors
  const skinColor = "#e0ac69"; // Warm skin tone
  const hairColor = "#2c222b"; // Dark hair
  const shirtColor = "#1a1a1a"; // Dark grey shirt
  const pantsColor = "#0a0a0a"; // Black shorts
  const shoeColor = "#ffffff"; // White sneakers

  // Scales based on config
  const muscleScale = 1 + (config.muscleMass * 0.4);
  const fatScale = 1 + (config.bodyFat * 0.4);
  
  // Proportions based on gender
  const shoulderW = (isFemale ? 0.6 : 0.85) * muscleScale;
  const torsoW = (isFemale ? 0.55 : 0.65) * fatScale;
  const hipW = (isFemale ? 0.75 : 0.65) * fatScale;

  return (
    <group ref={group} position={[0, -1.4, 0]}>
      {/* Head Group */}
      <group position={[0, 2.6, 0]}>
        {/* Face */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.35, 0.4, 0.35]} />
          <meshStandardMaterial color={skinColor} roughness={0.4} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.08, 0.05, 0.18]}>
          <boxGeometry args={[0.04, 0.04, 0.02]} />
          <meshStandardMaterial color="#000000" roughness={0.8} />
        </mesh>
        <mesh position={[0.08, 0.05, 0.18]}>
          <boxGeometry args={[0.04, 0.04, 0.02]} />
          <meshStandardMaterial color="#000000" roughness={0.8} />
        </mesh>
        {/* Hair Top */}
        <mesh position={[0, 0.22, 0]}>
          <boxGeometry args={[0.38, 0.1, 0.38]} />
          <meshStandardMaterial color={hairColor} roughness={0.9} />
        </mesh>
        {/* Hair Back/Sides */}
        {isFemale ? (
          <mesh position={[0, -0.1, -0.15]}>
            <boxGeometry args={[0.4, 0.6, 0.15]} />
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </mesh>
        ) : (
          <mesh position={[0, 0.05, -0.15]}>
            <boxGeometry args={[0.38, 0.3, 0.1]} />
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </mesh>
        )}
      </group>

      {/* Neck */}
      <mesh position={[0, 2.3, 0]}>
        <boxGeometry args={[0.15, 0.2, 0.15]} />
        <meshStandardMaterial color={skinColor} roughness={0.4} />
      </mesh>

      {/* Torso (Shirt) */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[torsoW, 1.2, 0.3 * fatScale]} />
        <meshStandardMaterial color={shirtColor} roughness={0.7} />
      </mesh>
      
      {/* Chest/Shoulders accent */}
      <mesh position={[0, 1.9, 0.01]}>
        <boxGeometry args={[shoulderW, 0.6, 0.3 * fatScale]} />
        <meshStandardMaterial color={shirtColor} roughness={0.7} />
      </mesh>

      {/* Logo on shirt */}
      <mesh position={[0, 1.8, (0.15 * fatScale) + 0.01]}>
        <planeGeometry args={[0.2, 0.2]} />
        <meshStandardMaterial color="#39ff14" emissive="#39ff14" emissiveIntensity={0.5} />
      </mesh>

      {/* Arms */}
      {/* Left Arm */}
      <group position={[-shoulderW/2 - 0.15, 2.0, 0]} rotation={[0, 0, 0.1]}>
        {/* Sleeve */}
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.22 * muscleScale, 0.4, 0.22 * muscleScale]} />
          <meshStandardMaterial color={shirtColor} roughness={0.7} />
        </mesh>
        {/* Skin Arm */}
        <mesh position={[0, -0.7, 0]}>
          <boxGeometry args={[0.18 * muscleScale, 0.8, 0.18 * muscleScale]} />
          <meshStandardMaterial color={skinColor} roughness={0.4} />
        </mesh>
      </group>
      {/* Right Arm */}
      <group position={[shoulderW/2 + 0.15, 2.0, 0]} rotation={[0, 0, -0.1]}>
        {/* Sleeve */}
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.22 * muscleScale, 0.4, 0.22 * muscleScale]} />
          <meshStandardMaterial color={shirtColor} roughness={0.7} />
        </mesh>
        {/* Skin Arm */}
        <mesh position={[0, -0.7, 0]}>
          <boxGeometry args={[0.18 * muscleScale, 0.8, 0.18 * muscleScale]} />
          <meshStandardMaterial color={skinColor} roughness={0.4} />
        </mesh>
      </group>

      {/* Pelvis/Shorts */}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[hipW, 0.4, 0.32 * fatScale]} />
        <meshStandardMaterial color={pantsColor} roughness={0.8} />
      </mesh>

      {/* Legs */}
      {/* Left Leg */}
      <group position={[-hipW/4 - 0.02, 0.7, 0]}>
        {/* Shorts leg */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.26 * muscleScale, 0.4, 0.28 * muscleScale]} />
          <meshStandardMaterial color={pantsColor} roughness={0.8} />
        </mesh>
        {/* Skin Leg */}
        <mesh position={[0, -0.5, 0]}>
          <boxGeometry args={[0.2 * muscleScale, 0.8, 0.2 * muscleScale]} />
          <meshStandardMaterial color={skinColor} roughness={0.4} />
        </mesh>
        {/* Shoe */}
        <mesh position={[0, -0.95, 0.05]}>
          <boxGeometry args={[0.22 * muscleScale, 0.15, 0.3 * muscleScale]} />
          <meshStandardMaterial color={shoeColor} roughness={0.5} />
        </mesh>
      </group>

      {/* Right Leg */}
      <group position={[hipW/4 + 0.02, 0.7, 0]}>
        {/* Shorts leg */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.26 * muscleScale, 0.4, 0.28 * muscleScale]} />
          <meshStandardMaterial color={pantsColor} roughness={0.8} />
        </mesh>
        {/* Skin Leg */}
        <mesh position={[0, -0.5, 0]}>
          <boxGeometry args={[0.2 * muscleScale, 0.8, 0.2 * muscleScale]} />
          <meshStandardMaterial color={skinColor} roughness={0.4} />
        </mesh>
        {/* Shoe */}
        <mesh position={[0, -0.95, 0.05]}>
          <boxGeometry args={[0.22 * muscleScale, 0.15, 0.3 * muscleScale]} />
          <meshStandardMaterial color={shoeColor} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

export default function Avatar3D() {
  const profile = useAppStore((state) => state.profile);
  const config = profile?.avatarConfig || { muscleMass: 0.5, bodyFat: 0.5 };
  const gender = profile?.gender || 'Masculino';

  return (
    <div className="w-full h-[300px] relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#121212] to-black border border-[#262626] glow-box">
      <Canvas 
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ powerPreference: "high-performance", antialias: false, preserveDrawingBuffer: true }}
      >
        <ambientLight intensity={0.7} />
        {/* Main light for the face/body */}
        <directionalLight position={[2, 5, 5]} intensity={1.5} color="#ffffff" />
        {/* Neon accent light */}
        <spotLight position={[-5, 5, -5]} angle={0.3} penumbra={1} intensity={2} color="#39ff14" />
        
        <HumanAvatar config={config} gender={gender} />
        
        <ContactShadows position={[0, -1.5, 0]} opacity={0.5} scale={5} blur={2} far={2} color="#000000" />
        <Environment preset="city" />
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2 + 0.1} minPolarAngle={Math.PI / 2 - 0.5} />
      </Canvas>
      
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-[#39ff14]/30 text-xs text-[#39ff14] font-mono">
        ESTADO FÍSICO 3D
      </div>
    </div>
  );
}
