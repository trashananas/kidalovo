'use client';

import { Room } from '@/components/room';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RoomPage() {
  const params = useParams();
  
  const roomId = typeof params?.roomId === 'string' ? params.roomId : null;

  if (!roomId) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  const upperCaseRoomId = roomId.toUpperCase();

  return <Room roomId={upperCaseRoomId} />;
}