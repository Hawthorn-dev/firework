"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PositionalAudio } from "@react-three/drei";
import * as THREE from "three";
import { createExplosionBuffer } from "../utils/audio";

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
  active: boolean;
  scale: number;
  generation: number;
}

interface FireworkConfig {
  count: number;
  gravity: number;
  drag: number;
  lifeSpan: number;
  split: boolean;
  parentCount?: number;
}

export default function Firework({ position, color, type, onComplete }: FireworkProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const audioRef = useRef<THREE.PositionalAudio>(null!);
  const { camera } = useThree();

  // Configuration based on type
  const config = useMemo<FireworkConfig>(() => {
    switch (type) {
      case "willow":
        // Willow: Falls down (gravity), slows down horizontally (low drag), long life
        return { count: 400, gravity: 3, drag: 0.92, lifeSpan: 3.0, split: false };
      case "crossette":
        // Crossette: Splits mid-air
        return { count: 1000, gravity: 9.8, drag: 0.96, lifeSpan: 1.5, split: true, parentCount: 200 };
      case "peony":
      case "classic":
      default:
        // Peony: Standard spherical explosion
        return { count: 600, gravity: 9.8, drag: 0.96, lifeSpan: 1.2, split: false };
    }
  }, [type]);

  const lifeRef = useRef(config.lifeSpan);
  const particlesRef = useRef<Particle[]>([]);
  const hasSplitRef = useRef(false);

  // Initialize particles
  useEffect(() => {
    const data: Particle[] = [];
    const baseColor = new THREE.Color(color);

    // Determine effective count to spawn initially
    const initialCount = config.split ? config.parentCount! : config.count;

    for (let i = 0; i < config.count; i++) {
      const isParent = i < initialCount;

      // Initial burst logic
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = Math.random() * 10 + 5;

      const x = speed * Math.sin(phi) * Math.cos(theta);
      const y = speed * Math.sin(phi) * Math.sin(theta);
      const z = speed * Math.cos(phi);

      data.push({
        position: new THREE.Vector3(0, 0, 0),
        velocity: new THREE.Vector3(x, y, z),
        color: baseColor.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.2),
        active: isParent,
        scale: 1.0,
        generation: 0,
      });
    }
    particlesRef.current = data;
    lifeRef.current = config.lifeSpan;
    hasSplitRef.current = false;
  }, [color, type, config]);

  // Audio effect
  useEffect(() => {
    if (!audioRef.current) return;

    // Create buffer
    const context = audioRef.current.context;
    const buffer = createExplosionBuffer(context);
    audioRef.current.setBuffer(buffer);
    audioRef.current.setRefDistance(20);
    audioRef.current.setRolloffFactor(1);

    // Calculate delay
    const fireworkPos = new THREE.Vector3(...position);
    const dist = camera.position.distanceTo(fireworkPos);
    const speedOfSound = 343; // m/s
    const delayMs = (dist / speedOfSound) * 1000;

    // Play sound with delay
    const timer = setTimeout(() => {
        if (audioRef.current && !audioRef.current.isPlaying) {
             if (context.state === 'suspended') context.resume();
             // Randomize pitch slightly for variety
             audioRef.current.setDetune((Math.random() - 0.5) * 600);
             audioRef.current.play();
        }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [camera, position, type]); // Run when these change (basically on mount)

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    if (!meshRef.current || particlesRef.current.length === 0) return;

    lifeRef.current -= delta;
    const lifeRatio = lifeRef.current / config.lifeSpan;

    if (lifeRef.current <= 0) {
      onComplete();
      return;
    }

    // Crossette split logic
    if (config.split && !hasSplitRef.current && lifeRatio < 0.6) {
      hasSplitRef.current = true;
      const parentCount = config.parentCount!;

      let childIndex = parentCount;
      // We iterate through parents to split them
      for (let i = 0; i < parentCount; i++) {
        const parent = particlesRef.current[i];
        if (!parent.active) continue;

        // Each parent splits into 4 children (replacing itself + 3 new, or just 4 new)
        // Here we deactivate parent and activate 4 children to simulate full break
        parent.active = false;

        for (let j = 0; j < 4; j++) {
           if (childIndex >= config.count) break;
           const child = particlesRef.current[childIndex];
           child.active = true;
           child.position.copy(parent.position);
           child.generation = 1;

           // Inherit velocity but add spread
           child.velocity.copy(parent.velocity).multiplyScalar(0.6);

           // Add cross/random burst
           // Crossette usually bursts in a + shape relative to trajectory
           // Simplifying to random burst
           const theta = Math.random() * Math.PI * 2;
           const phi = Math.random() * Math.PI;
           const burstSpeed = 8;

           child.velocity.x += burstSpeed * Math.sin(phi) * Math.cos(theta);
           child.velocity.y += burstSpeed * Math.sin(phi) * Math.sin(theta);
           child.velocity.z += burstSpeed * Math.cos(phi);

           childIndex++;
        }
      }
    }

    // Physics Update
    const dragFactor = Math.pow(config.drag, delta * 60);

    particlesRef.current.forEach((particle, i) => {
      if (!particle.active) {
        // Hide inactive particles
        meshRef.current!.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
        return;
      }

      // Physics
      particle.velocity.y -= config.gravity * delta;
      particle.velocity.multiplyScalar(dragFactor);

      particle.position.addScaledVector(particle.velocity, delta);

      // Render Update
      dummy.position.copy(particle.position);

      let scale = lifeRatio * particle.scale;
      // Fade out effect

      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      // Color Update
      tempColor.copy(particle.color);
      // Fade intensity
      tempColor.multiplyScalar(lifeRatio);
      meshRef.current!.setColorAt(i, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, config.count]} position={position}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        transparent
        vertexColors
      />
      <PositionalAudio ref={audioRef} />
    </instancedMesh>
  );
}
