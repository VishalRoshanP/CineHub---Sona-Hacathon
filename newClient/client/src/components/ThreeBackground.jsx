import { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerspectiveCamera, OrbitControls, Preload } from "@react-three/drei";
import Scene from "./Scene";

// Camera Controller for mouse tracking with smooth parallax
function CameraController() {
  const { camera } = useThree();
  const targetRotation = useRef({ x: 0, y: 0 });
  const currentRotation = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = event => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Subtle parallax effect
      targetRotation.current.x = y * 0.2;
      targetRotation.current.y = x * 0.2;
    };

    const handleTouchMove = event => {
      if (event.touches.length > 0) {
        const x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
        const y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;

        targetRotation.current.x = y * 0.15;
        targetRotation.current.y = x * 0.15;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  useEffect(() => {
    let animationId;

    const animate = () => {
      // Smooth interpolation
      currentRotation.current.x +=
        (targetRotation.current.x - currentRotation.current.x) * 0.08;
      currentRotation.current.y +=
        (targetRotation.current.y - currentRotation.current.y) * 0.08;

      camera.rotation.x = currentRotation.current.x;
      camera.rotation.y = currentRotation.current.y;

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [camera]);

  return null;
}

// Loading Fallback
function CanvasLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-400">Loading 3D scene...</p>
      </div>
    </div>
  );
}

export default function ThreeBackground() {
  const [isMobile, setIsMobile] = useState(false);
  const [isLowEnd, setIsLowEnd] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      // Detect low-end devices
      const cores = navigator.hardwareConcurrency || 1;
      const memory = navigator.deviceMemory || 4;
      setIsLowEnd(cores <= 2 || memory <= 4);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 w-full h-full">
      <Canvas
        gl={{
          antialias: !isLowEnd,
          alpha: true,
          powerPreference: isLowEnd ? "low-power" : "high-performance",
          stencil: false,
          depth: true,
        }}
        dpr={isMobile ? [1, 1.5] : isLowEnd ? [1, 1.5] : [1, 2]}
        camera={{ position: [0, 0, 22], fov: 75, near: 0.1, far: 1000 }}
        performance={{ min: 0.5, max: isLowEnd ? 0.8 : 1 }}
        onCreated={({ gl }) => {
          // Brighter output
          gl.setClearColor(0x060712, 0);
          gl.toneMappingExposure = 1.55;
        }}
      >
        {/* Slight fog for depth (cheap) */}
        <fog attach="fog" args={["#060712", 40, 140]} />

        {/* Brighter scene lighting (kept cheap for perf) */}
        <ambientLight intensity={1.05} />
        <directionalLight position={[6, 10, 10]} intensity={1.35} />
        <pointLight position={[-10, -6, 10]} intensity={0.85} />

        <Suspense fallback={null}>
          {/* Camera with mouse tracking */}
          <CameraController />

          {/* Scene with 3D objects */}
          <Scene />

          {/* Optional: Orbit Controls for desktop (auto-rotate) */}
          {!isMobile && (
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              autoRotate
              autoRotateSpeed={0.3}
              maxPolarAngle={Math.PI}
              minPolarAngle={0}
            />
          )}

          {/* Preload assets */}
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  );
}
