'use client';

import { Room } from '@/components/room';

type RoomPageProps = {
  params: {
    roomId: string;
  };
};

export default function RoomPage({ params }: RoomPageProps) {
  const { roomId } = params;
  const upperCaseRoomId = roomId.toUpperCase();
  
  // We no longer need to fetch the room here, 
  // the Room component and its hook will handle it.
  // This also means we don't need to check for existence here,
  // the useRoom hook can handle that state.

  return <Room roomId={upperCaseRoomId} />;
}
