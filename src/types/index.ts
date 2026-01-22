import type { Timestamp } from 'firebase/firestore';

export type Message = {
  id: string;
  text: string;
  userId: string;
  createdAt: Timestamp;
  position: {
    x: number;
    y: number;
  };
  size?: {
    width: number;
    height: number;
  };
};
