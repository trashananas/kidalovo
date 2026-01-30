import type { Timestamp } from 'firebase/firestore';

export type FileAttachment = {
  name: string;
  type: string;
  url: string;
};

export type Message = {
  id: string;
  text?: string;
  type?: 'audit' | 'message';
  file?: FileAttachment;
  userId: string;
  authorName?: string;
  authorColor?: string;
  authorLogin?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  isDeleted?: boolean;
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

export type DrawingShape = 'path' | 'arrow' | 'rectangle' | 'ellipse' | 'triangle';

export type DrawingObject = {
  id: string;
  userId: string;
  type: DrawingShape;
  points: Point[];
  color: string;
  strokeWidth: number;
  rotation?: number;
  createdAt: Timestamp;
};

export type UserProfile = {
  id: string;
  username: string;
  color: string;
  login?: string;
};
