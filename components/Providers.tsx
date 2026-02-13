"use client";

import { ReactNode } from "react";
import { RoomProvider } from "../liveblocks.config";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <RoomProvider id="fireworks-world" initialPresence={{}}>
      {children}
    </RoomProvider>
  );
}
