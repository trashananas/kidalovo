import { collection, getDocs, limit, query, where } from 'firebase/firestore';
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

  const roomsRef = collection(db, 'rooms');
  const q = query(roomsRef, where('code', '==', roomId.toUpperCase()), limit(1));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return notFound();
  }
  const roomDoc = querySnapshot.docs[0];

  return <Room roomId={roomId.toUpperCase()} roomDocId={roomDoc.id} />;
}
