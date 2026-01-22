import type { Timestamp } from 'firebase/firestore';

export type Message = {
  id: string;
  text: string;
  createdAt: Timestamp;
  position: {
    x: number;
    y: number;
  };
};
