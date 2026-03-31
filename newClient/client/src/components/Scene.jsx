import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Sphere, Torus, Box, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Floating Sphere with glow
function FloatingSphere({ position, scale, speed, color, intensity = 0.5 }) {
  const meshRef = useRef();
  const glowRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += speed * 0.001;
      meshRef.current.rotation.y += speed * 0.0015;
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * speed * 0.5) * 0.001;
    }
    if (glowRef.current) {
      glowRef.current.rotation.x -= speed * 0.0008;
      glowRef.current.rotation.y -= speed * 0.0012;
    }
  });

  return (
    <Float speed={speed} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} position={position} scale={scale}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={intensity}
          metalness={0.7}
          roughness={0.2}
          wireframe={false}
        />
      </mesh>
      {/* Glow effect */}
      <mesh ref={glowRef} position={position} scale={scale * 1.25}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.12}
          wireframe={false}
        />
      </mesh>
      {/* Outer glow ring */}
      <mesh position={position} scale={scale * 1.4}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.05}
          wireframe={false}
        />
      </mesh>
    </Float>
  );
}

// Rotating Torus with enhanced glow
function RotatingTorus({ position, scale, speed, color, intensity = 0.4 }) {
  const meshRef = useRef();
  const glowRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += speed * 0.0008;
      meshRef.current.rotation.y += speed * 0.001;
      meshRef.current.rotation.z += speed * 0.0006;
    }
    if (glowRef.current) {
      glowRef.current.rotation.x -= speed * 0.0006;
      glowRef.current.rotation.y -= speed * 0.0008;
      glowRef.current.rotation.z -= speed * 0.0004;
    }
  });

  return (
    <Float speed={speed * 0.8} rotationIntensity={0.3} floatIntensity={0.8}>
      <mesh ref={meshRef} position={position} scale={scale}>
        <torusGeometry args={[1, 0.4, 32, 128]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={intensity}
          metalness={0.8}
          roughness={0.1}
          wireframe={false}
        />
      </mesh>
      {/* Glow ring */}
      <mesh ref={glowRef} position={position} scale={scale * 1.15} rotation={[0.3, 0.5, 0.2]}>
        <torusGeometry args={[1, 0.4, 16, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.1}
          wireframe={false}
        />
      </mesh>
      {/* Outer glow */}
      <mesh position={position} scale={scale * 1.3} rotation={[-0.3, -0.5, -0.2]}>
        <torusGeometry args={[1, 0.4, 12, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.05}
          wireframe={false}
        />
      </mesh>
    </Float>
  );
}

// Wireframe Box
function WireframeBox({ position, scale, speed, color }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += speed * 0.0006;
      meshRef.current.rotation.y += speed * 0.0009;
      meshRef.current.rotation.z += speed * 0.0003;
    }
  });

  return (
    <Float speed={speed * 0.6} rotationIntensity={0.2} floatIntensity={0.6}>
      <mesh ref={meshRef} position={position} scale={scale}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          metalness={0.6}
          roughness={0.3}
          wireframe={true}
        />
      </mesh>
    </Float>
  );
}

// Particle Field with depth
function ParticleField() {
  const particlesRef = useRef();
  const particleCount = 300;

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.x += 0.00003;
      particlesRef.current.rotation.y += 0.00008;
    }
  });

  // Generate particle positions with depth
  const positions = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount * 3; i += 3) {
    const x = (Math.random() - 0.5) * 120;
    const y = (Math.random() - 0.5) * 120;
    const z = (Math.random() - 0.5) * 120;

    positions[i] = x;
    positions[i + 1] = y;
    positions[i + 2] = z;

    // Size based on depth for parallax effect
    sizes[i / 3] = Math.abs(z) / 60 + 0.2;
  }

  return (
    <group ref={particlesRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={particleCount}
            array={sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.4}
          color="#a855f7"
          sizeAttenuation
          transparent
          opacity={0.5}
        />
      </points>

      {/* Secondary particle layer for depth */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.15}
          color="#ec4899"
          sizeAttenuation
          transparent
          opacity={0.3}
        />
      </points>
    </group>
  );
}

// Main Scene Component
export default function Scene() {
  return (
    <>
      {/* Starfield background */}
      <Stars
        radius={150}
        depth={50}
        count={1000}
        factor={4}
        saturation={0.5}
        fade
        speed={0.1}
      />

      {/* Particle Field Background */}
      <ParticleField />

      {/* Floating Spheres */}
      <FloatingSphere
        position={[-15, 5, -20]}
        scale={2.5}
        speed={2}
        color="#a855f7"
        intensity={0.6}
      />
      <FloatingSphere
        position={[20, -8, -15]}
        scale={1.8}
        speed={1.5}
        color="#ec4899"
        intensity={0.5}
      />
      <FloatingSphere
        position={[0, 15, -25]}
        scale={1.2}
        speed={1}
        color="#f97316"
        intensity={0.4}
      />

      {/* Rotating Torus */}
      <RotatingTorus
        position={[10, 8, -20]}
        scale={2}
        speed={2.5}
        color="#06b6d4"
        intensity={0.5}
      />
      <RotatingTorus
        position={[-12, -10, -18]}
        scale={1.5}
        speed={1.8}
        color="#8b5cf6"
        intensity={0.4}
      />

      {/* Wireframe Boxes */}
      <WireframeBox
        position={[15, -5, -22]}
        scale={1.5}
        speed={1.2}
        color="#06b6d4"
      />
      <WireframeBox
        position={[-8, 12, -20]}
        scale={1}
        speed={0.8}
        color="#a855f7"
      />

      {/* Ambient Light */}
      <ambientLight intensity={0.35} color="#ffffff" />

      {/* Point Lights for Glow with color */}
      <pointLight
        position={[-15, 5, -20]}
        intensity={2}
        distance={60}
        color="#a855f7"
        decay={2}
      />
      <pointLight
        position={[20, -8, -15]}
        intensity={1.8}
        distance={50}
        color="#ec4899"
        decay={2}
      />
      <pointLight
        position={[10, 8, -20]}
        intensity={1.5}
        distance={45}
        color="#06b6d4"
        decay={2}
      />

      {/* Fill Light */}
      <pointLight
        position={[0, 0, 15]}
        intensity={1}
        distance={80}
        color="#ffffff"
        decay={2}
      />

      {/* Accent Light */}
      <pointLight
        position={[-20, 20, 10]}
        intensity={0.8}
        distance={60}
        color="#f97316"
        decay={2}
      />
    </>
  );
}
