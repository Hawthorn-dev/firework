"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createExplosionBuffer } from "../utils/audio";
import { createGlowTexture } from "../utils/texture";

interface FireworkProps {
  position: [number, number, number];
  color: string;
  type: string;
  onComplete: () => void;
  listener: THREE.AudioListener;
}

// Particle system for explosion
class Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  alpha: number;
  life: number;
  maxLife: number;
  scale: number;
  shouldFlicker: boolean;

  constructor(pos: THREE.Vector3, vel: THREE.Vector3, color: THREE.Color) {
    this.position = pos.clone();
    this.velocity = vel.clone();
    this.color = color.clone();
    this.alpha = 1.0;
    this.life = 0;
    this.maxLife = 1.0 + Math.random() * 0.5;
    this.scale = 1.0;
    this.shouldFlicker = Math.random() > 0.5;
  }

  update(delta: number, gravity: number, drag: number) {
    this.life += delta;

    // Physics
    this.velocity.y -= gravity * delta;
    this.velocity.multiplyScalar(Math.pow(drag, delta * 60));
    this.position.addScaledVector(this.velocity, delta);

    // Fade out
    this.alpha = 1.0 - (this.life / this.maxLife);
  }
}

// Rocket for launch phase
class Rocket {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetHeight: number;
  color: THREE.Color;
  trail: THREE.Vector3[];

  constructor(startPos: THREE.Vector3, height: number, color: THREE.Color) {
    this.position = new THREE.Vector3(startPos.x, 0, startPos.z);
    this.targetHeight = startPos.y; // The passed position is target
    this.velocity = new THREE.Vector3(0, Math.sqrt(2 * 15 * this.targetHeight), 0); // v^2 = u^2 + 2as, approx
    this.color = color;
    this.trail = [];
  }

  update(delta: number) {
    this.position.addScaledVector(this.velocity, delta);
    this.velocity.y -= 5 * delta; // Less gravity during launch for effect

    // Trail history
    this.trail.push(this.position.clone());
    if (this.trail.length > 20) this.trail.shift();
  }
}

export default function Firework({ position, color, type, onComplete, listener }: FireworkProps) {
  const pointsRef = useRef<THREE.Points>(null!);
  const audioRef = useRef<THREE.PositionalAudio>(null!);
  const launchAudioRef = useRef<THREE.PositionalAudio>(null!);

  const [phase, setPhase] = useState<'LAUNCH' | 'EXPLODE'>('LAUNCH');
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  // Initialize objects
  const rocket = useMemo(() => new Rocket(new THREE.Vector3(...position), position[1], new THREE.Color(color)), [position, color]);
  const particles = useRef<Particle[]>([]);

  // Geometry for points
  const geometry = useMemo(() => new THREE.BufferGeometry(), []);

  // Load texture once
  useEffect(() => {
    setTexture(createGlowTexture());
  }, []);

  // Launch sound
  useEffect(() => {
    if (launchAudioRef.current && phase === 'LAUNCH') {
      const buffer = createExplosionBuffer(launchAudioRef.current.context); // Reuse buffer for now
      launchAudioRef.current.setBuffer(buffer);
      launchAudioRef.current.setRefDistance(20);
      launchAudioRef.current.setPlaybackRate(2.0); // Higher pitch for whistle
      launchAudioRef.current.setVolume(0.5);
      if (launchAudioRef.current.context.state === 'running') {
        launchAudioRef.current.play();
      }
    }
  }, [phase]);

  // Explosion Logic
  const explode = () => {
    setPhase('EXPLODE');

    // Play explosion sound
    if (audioRef.current) {
      const buffer = createExplosionBuffer(audioRef.current.context);
      audioRef.current.setBuffer(buffer);
      audioRef.current.setRefDistance(20);
      audioRef.current.setPlaybackRate(0.8 + Math.random() * 0.4);
      if (audioRef.current.context.state === 'running') {
        audioRef.current.play();
      }
    }

    // Generate particles based on type
    const count = type === 'crossette' ? 100 : 300;
    const baseColor = new THREE.Color(color);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = Math.random() * 15 + 10; // Faster burst

      const velocity = new THREE.Vector3(
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.sin(phi) * Math.sin(theta),
        speed * Math.cos(phi)
      );

      // Add parent velocity
      velocity.add(rocket.velocity.clone().multiplyScalar(0.2));

      const particleColor = baseColor.clone();
      if (type === 'willow') particleColor.setHSL(0.1, 1, 0.5); // Gold

      particles.current.push(new Particle(rocket.position, velocity, particleColor));
    }
  };

  useFrame((state, delta) => {
    if (!pointsRef.current || !texture) return;

    const positions: number[] = [];
    const colors: number[] = [];

    if (phase === 'LAUNCH') {
      rocket.update(delta);

      // Check if reached target height (or slowed down enough)
      if (rocket.velocity.y <= 2 || rocket.position.y >= rocket.targetHeight) {
        explode();
        return;
      }

      // Render rocket head
      positions.push(rocket.position.x, rocket.position.y, rocket.position.z);
      colors.push(rocket.color.r, rocket.color.g, rocket.color.b);

      // Render trail
      rocket.trail.forEach((pos, i) => {
        const alpha = i / rocket.trail.length;
        positions.push(pos.x, pos.y, pos.z);
        colors.push(rocket.color.r * alpha, rocket.color.g * alpha, rocket.color.b * alpha);
      });

    } else {
      // Explode phase
      let alive = false;
      particles.current.forEach(p => {
        p.update(delta, 5.0, 0.95); // gravity, drag
        if (p.life < p.maxLife) {
          alive = true;
          positions.push(p.position.x, p.position.y, p.position.z);

          // Colors with flicker
          let alpha = p.alpha;
          if (p.shouldFlicker) alpha *= (0.5 + Math.random() * 0.5);

          colors.push(p.color.r * alpha, p.color.g * alpha, p.color.b * alpha);
        }
      });

      if (!alive) {
        onComplete();
        return;
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // Mark as needing update
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.computeBoundingSphere(); // Important for culling
  });

  if (!texture) return null;

  return (
    <group>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          map={texture}
          size={0.8}
          sizeAttenuation={true}
          vertexColors={true}
          transparent={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <positionalAudio ref={launchAudioRef} args={[listener]} />
      <positionalAudio ref={audioRef} args={[listener]} />
    </group>
  );
}
