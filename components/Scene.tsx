"use client";

import { Canvas, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, MeshReflectorMaterial } from "@react-three/drei";
import { useState, useEffect } from "react";
import Firework from "./Firework";
import AudioListener from "./AudioListener";
import { useBroadcast, useEventListener } from "../liveblocks.config";

export default function Scene() {
  const [fireworks, setFireworks] = useState<{ id: number; position: [number, number, number]; color: string; type: string }[]>([]);
  const broadcast = useBroadcast();

  const handleFireworkComplete = (id: number) => {
    setFireworks((prev) => prev.filter((fw) => fw.id !== id));
  };

  const handleReflectorClick = (e: ThreeEvent<MouseEvent>) => {
    // Prevent event bubbling if needed, though here it's fine
    e.stopPropagation();

    // e.point is the intersection point
    // Spawn firework slightly above the click point
    const position: [number, number, number] = [e.point.x, e.point.y + 5, e.point.z];
    const color = "#" + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');

    const types = ["peony", "willow", "crossette"];
    const fireworkType = types[Math.floor(Math.random() * types.length)];

    const newFirework = {
      id: Date.now() + Math.random(), // Unique ID
      position,
      color,
      type: fireworkType,
    };

    // Add locally
    setFireworks((prev) => [...prev, newFirework]);

    // Broadcast to others
    broadcast({
        type: "LAUNCH_FIREWORK",
        x: position[0],
        y: position[1],
        z: position[2],
        color,
        fireworkType
    });
  };

  useEventListener(({ event }) => {
    if (event.type === "LAUNCH_FIREWORK") {
      const { x, y, z, color, fireworkType } = event;
      const newFirework = {
        id: Date.now() + Math.random(),
        position: [x, y, z] as [number, number, number],
        color,
        type: fireworkType,
      };
      setFireworks((prev) => [...prev, newFirework]);
    }
  });

  // Auto-spawn one for demonstration on load
  useEffect(() => {
    const timer = setTimeout(() => {
      setFireworks((prev) => [...prev, { id: 1, position: [0, 3, 0], color: "#ff0000", type: "classic" }]);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-screen w-full bg-black">
      <Canvas camera={{ position: [0, 5, 15], fov: 45 }}>
        <AudioListener />

        {/* Deep black sky */}
        <color attach="background" args={["#050505"]} />

        {/* Lighting to prevent total darkness */}
        <ambientLight intensity={0.5} />

        {/* User controls */}
        <OrbitControls />

        {/* Fireworks */}
        {fireworks.map((fw) => (
            <Firework
                key={fw.id}
                position={fw.position}
                color={fw.color}
                type={fw.type}
                onComplete={() => handleFireworkComplete(fw.id)}
            />
        ))}

        {/* Reflective Ground/Water */}
        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -2, 0]}
            onClick={handleReflectorClick}
        >
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
