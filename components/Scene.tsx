"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, MeshReflectorMaterial } from "@react-three/drei";

export default function Scene() {
  return (
    <div className="h-screen w-full bg-black">
      <Canvas camera={{ position: [0, 5, 15], fov: 45 }}>
        {/* Deep black sky */}
        <color attach="background" args={["#050505"]} />

        {/* Lighting to prevent total darkness */}
        <ambientLight intensity={0.5} />

        {/* User controls */}
        <OrbitControls />

        {/* Reflective Ground/Water */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
          <planeGeometry args={[50, 50]} />
          <MeshReflectorMaterial
            blur={[300, 100]}
            resolution={2048}
            mixBlur={1}
            mixStrength={40}
            roughness={1}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#101010"
            metalness={0.5}
            mirror={0.75}
          />
        </mesh>
      </Canvas>
    </div>
  );
}
