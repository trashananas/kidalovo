import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Room } from '@/components/room';
import { notFound } from 'next/navigation';

type RoomPageProps = {
  params: {
    roomId: string;
  };
};

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomId } = params;
  const upperCaseRoomId = roomId.toUpperCase();

  // Получаем комнату напрямую по ее ID (который является кодом комнаты).
  const roomRef = doc(db, 'rooms', upperCaseRoomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    return notFound();
  }

  // ID документа комнаты совпадает с ID комнаты из URL.
  return <Room roomId={upperCaseRoomId} roomDocId={upperCaseRoomId} />;
}
