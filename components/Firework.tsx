"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface FireworkProps {
  position: [number, number, number];
  color: string;
  type: string;
  onComplete: () => void;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
}

export default function Firework({ position, color, type, onComplete }: FireworkProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 1000;

  // Ref to track life
  const lifeRef = useRef(1.0);

  // Ref for particles to avoid impure render logic
  const particlesRef = useRef<Particle[]>([]);

  // Initialize particles on mount
  useEffect(() => {
    const data: Particle[] = [];
    // Use passed color or fallback to random
    const baseColor = new THREE.Color(color);

    for (let i = 0; i < count; i++) {
      // Random direction in a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = Math.random() * 10 + 5; // Initial burst speed

      const x = speed * Math.sin(phi) * Math.cos(theta);
      const y = speed * Math.sin(phi) * Math.sin(theta);
      const z = speed * Math.cos(phi);

      data.push({
        position: new THREE.Vector3(0, 0, 0), // Relative to firework center
        velocity: new THREE.Vector3(x, y, z),
        // Add slight variation to color
        color: baseColor.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.2),
      });
    }
    particlesRef.current = data;
  }, [color, type]);

  // Helpers for optimization
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    if (!meshRef.current || particlesRef.current.length === 0) return;

    // Reduce life
    lifeRef.current -= delta * 0.4;

    if (lifeRef.current <= 0) {
      onComplete();
      return;
    }

    const life = lifeRef.current;

    particlesRef.current.forEach((particle, i) => {
      // Physics
      particle.velocity.y -= 9.8 * delta; // Gravity
      particle.velocity.multiplyScalar(1 - 0.5 * delta); // Friction

      // Update position
      particle.position.addScaledVector(particle.velocity, delta);

      // Update Matrix
      dummy.position.copy(particle.position);
      const scale = life;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      // Update Color
      // Fade out by darkening the color (AdditiveBlending makes this look like opacity fade)
      tempColor.copy(particle.color).multiplyScalar(life);
      meshRef.current!.setColorAt(i, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} position={position}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        transparent
        vertexColors
      />
    </instancedMesh>
  );
}
