import * as THREE from "three";

export const createGlowTexture = (): THREE.CanvasTexture => {
  if (typeof document === 'undefined') return new THREE.CanvasTexture(new OffscreenCanvas(32, 32) as unknown as HTMLCanvasElement);

  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;

  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.2, "rgba(255, 255, 255, 0.8)");
  gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.2)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, 32, 32);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
};
