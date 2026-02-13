"use client";

import { Canvas, ThreeEvent, useThree } from "@react-three/fiber";
import { OrbitControls, MeshReflectorMaterial } from "@react-three/drei";
import { useState, useEffect } from "react";
import * as THREE from "three";
import Firework from "./Firework";
import { useBroadcast, useEventListener } from "../liveblocks.config";

interface FireworkData {
  id: number;
  position: [number, number, number];
  color: string;
  type: string;
}

export default function Scene() {
  const [fireworks, setFireworks] = useState<FireworkData[]>([]);
  const broadcast = useBroadcast();

  const handleFireworkComplete = (id: number) => {
    setFireworks((prev) => prev.filter((fw) => fw.id !== id));
  };

  const handleReflectorClick = (e: ThreeEvent<MouseEvent>) => {
    // Prevent event bubbling
    e.stopPropagation();

    // Spawn firework
    const position: [number, number, number] = [e.point.x, e.point.y + 5, e.point.z];
    const color = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

    const types = ["peony", "willow", "crossette"];
    const fireworkType = types[Math.floor(Math.random() * types.length)];

    const newFirework = {
      id: Date.now() + Math.random(),
      position,
      color,
      type: fireworkType,
    };

    setFireworks((prev) => [...prev, newFirework]);

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
      setFireworks((prev) => [...prev, {
        id: Date.now() + Math.random(),
        position: [x, y, z],
        color,
        type: fireworkType,
      }]);
    }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setFireworks((prev) => [...prev, { id: 1, position: [0, 3, 0], color: "#ff0000", type: "classic" }]);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-screen w-full bg-black">
      <Canvas camera={{ position: [0, 5, 15], fov: 45 }}>
        <Experience
          fireworks={fireworks}
          onFireworkComplete={handleFireworkComplete}
          onReflectorClick={handleReflectorClick}
        />
      </Canvas>
    </div>
  );
}

function Experience({
  fireworks,
  onFireworkComplete,
  onReflectorClick
}: {
  fireworks: FireworkData[],
  onFireworkComplete: (id: number) => void,
  onReflectorClick: (e: ThreeEvent<MouseEvent>) => void
}) {
  const { camera } = useThree();
  const [listener] = useState(() => new THREE.AudioListener());

  useEffect(() => {
    camera.add(listener);
    return () => {
      camera.remove(listener);
    };
  }, [camera, listener]);

  return (
    <>
      <color attach="background" args={["#050505"]} />
      <ambientLight intensity={0.5} />
      <OrbitControls />

      {fireworks.map((fw) => (
        <Firework
          key={fw.id}
          position={fw.position}
          color={fw.color}
          type={fw.type}
          onComplete={() => onFireworkComplete(fw.id)}
          listener={listener}
        />
      ))}

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -2, 0]}
        onClick={onReflectorClick}
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
    </>
  );
}
