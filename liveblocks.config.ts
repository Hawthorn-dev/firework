import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY || "pk_test_dummy",
});

type Presence = {};
type Storage = {};
type UserMeta = {};
type RoomEvent = {
  type: "LAUNCH_FIREWORK";
  x: number;
  y: number;
  z: number;
  color: string;
  fireworkType: string;
};

export const {
  RoomProvider,
  useBroadcastEvent: useBroadcast,
  useEventListener,
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);
