import type { Timestamp } from 'firebase/firestore';

export type MessageClassification = 'adds_information' | 'contradicts' | 'neutral';

export type Message = {
  id: string;
  text: string;
  createdAt: Timestamp;
  position: {
    x: number;
    y: number;
  };
  classification: MessageClassification;
  reason: string;
};
