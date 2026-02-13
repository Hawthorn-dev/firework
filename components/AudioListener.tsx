"use client";

import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export default function AudioListener() {
  const { camera } = useThree();
  const [listener] = useState(() => new THREE.AudioListener());

  useEffect(() => {
    camera.add(listener);
    return () => {
      camera.remove(listener);
    };
  }, [camera, listener]);

  return null;
}
