import type { Timestamp } from 'firebase/firestore';

export type FileAttachment = {
  name: string;
  type: string;
  url: string;
};

export type Message = {
  id: string;
  text?: string;
  file?: FileAttachment;
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

export type Point = {
  x: number;
  y: number;
};

export type Path = {
  id: string;
  userId: string;
  points: Point[];
  color: string;
  strokeWidth: number;
  createdAt: Timestamp;
};
