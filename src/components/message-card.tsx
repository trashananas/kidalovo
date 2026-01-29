'use client';

import type { Message } from '@/types';
import { Card } from './ui/card';
import { cn, getErrorMessage } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { GripVertical, Copy, File as FileIcon, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const GREEK_LOWER = {
  pi: 'π',
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  phi: 'φ',
  omega: 'ω',
  theta: 'θ',
  sigma: 'σ',
};
const GREEK_UPPER = {
  pi: 'Π',
  alpha: 'Α',
  beta: 'Β',
  gamma: 'Γ',
  delta: 'Δ',
  phi: 'Φ',
  omega: 'Ω',
  theta: 'Θ',
  sigma: 'Σ',
};
const GREEK_WORDS = Object.keys(GREEK_LOWER).join('|');
const GREEK_REGEX = new RegExp(`(?<![a-zA-Z])(${GREEK_WORDS})(?![a-zA-Z])`, 'gi');

const Spoiler = ({ children }: { children: React.ReactNode }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span
      className={cn(
        'inline-block rounded px-1 cursor-pointer transition-colors',
        isVisible
          ? 'bg-transparent'
          : 'bg-muted-foreground/30 hover:bg-muted-foreground/20'
      )}
      onClick={(e) => {
        e.stopPropagation();
        setIsVisible(!isVisible);
      }}
    >
      <span className={cn(isVisible ? 'opacity-100' : 'opacity-0')}>
        {children}
      </span>
    </span>
  );
};

const renderFormattedText = (text: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  const replacer = (str: string) => {
    let processed = str.replace(/валикова/gi, 'x');
    
    processed = processed.replace(/_=/g, '≡');
    processed = processed.replace(GREEK_REGEX, (match) => {
      const lowerMatch = match.toLowerCase() as keyof typeof GREEK_LOWER;
      
      const isTitleCase = match.charAt(0) === match.charAt(0).toUpperCase() && match.slice(1) === lowerMatch.slice(1);
      const isUpperCase = match === match.toUpperCase();

      if ((isTitleCase || isUpperCase) && GREEK_UPPER[lowerMatch]) {
        return GREEK_UPPER[lowerMatch];
      }
      
      if (GREEK_LOWER[lowerMatch]) {
        return GREEK_LOWER[lowerMatch];
      }

      return match;
    });
    
    return processed;
  };

  const regex = new RegExp(
    '(@(.*?)\@\{(.*?)\})' + // 1, 2, 3: Link
      '|(?<![\\wа-яА-Я])(\\*([^*].*?[^*]|[^\\s*])\\*)(?![\\wа-яА-Я])' + // 4, 5: Bold
      '|(?<![\\wа-яА-Я])(\\\\([^\\\\]*?)\\\\)(?![\\wа-яА-Я])' + // 6, 7: Italic
      '|(?<![\\wа-яА-Я])(_([^_]*?)_)(?![\\wа-яА-Я])' + // 8, 9: Underline
      '|(?<![\\wа-яА-Я])(\\$([^$]*?)\\$)(?![\\wа-яА-Я])' + // 10, 11: Strike
      '|(?<![\\wа-яА-Я])(#([^#]*?)#)(?![\\wа-яА-Я])' + // 12, 13: Spoiler
      '|((?:https?://|www\\.)[^\\s]+)' + // 14: Autolink
      '|(\\s<3\\s)', // 15: Heart
    'g'
  );


  let match;
  while ((match = regex.exec(text)) !== null) {
    const startIndex = match.index;
    
    // Add text before the match
    if (startIndex > lastIndex) {
      nodes.push(replacer(text.substring(lastIndex, startIndex)));
    }

    // Handle link: @text@{url}
    if (match[2] !== undefined && match[3] !== undefined) {
      nodes.push(
        <a
          key={lastIndex}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline dark:text-blue-400"
          onClick={(e) => e.stopPropagation()}
        >
          {replacer(match[2])}
        </a>
      );
    }
    // Handle bold: *text*
    else if (match[5] !== undefined) {
      nodes.push(<strong key={lastIndex}>{replacer(match[5])}</strong>);
    }
    // Handle italic: \text\
    else if (match[7] !== undefined) {
      nodes.push(<em key={lastIndex}>{replacer(match[7])}</em>);
    }
    // Handle underline: _text_
    else if (match[9] !== undefined) {
      nodes.push(<u key={lastIndex}>{replacer(match[9])}</u>);
    }
    // Handle strikethrough: $text$
    else if (match[11] !== undefined) {
      nodes.push(<s key={lastIndex}>{replacer(match[11])}</s>);
    }
    // Handle spoiler: #text#
    else if (match[13] !== undefined) {
      nodes.push(<Spoiler key={lastIndex}>{replacer(match[13])}</Spoiler>);
    }
    // Handle autolink
    else if (match[14] !== undefined) {
      const url = match[14].startsWith('www.')
        ? `http://${match[14]}`
        : match[14];
      nodes.push(
        <a
          key={lastIndex}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline dark:text-blue-400"
          onClick={(e) => e.stopPropagation()}
        >
          {replacer(match[14])}
        </a>
      );
    }
    // Handle heart
    else if (match[15] !== undefined) {
      nodes.push(<span key={lastIndex}> ❤️ </span>);
    }
    // If no specific format matched but the main regex did, push the original text
    else {
      nodes.push(replacer(match[0]));
    }


    lastIndex = regex.lastIndex;
  }

  // Add any remaining text after the last match
  if (lastIndex < text.length) {
    nodes.push(replacer(text.substring(lastIndex)));
  }

  return nodes;
};

type MessageCardProps = {
  message: Message;
  roomId: string;
  panOffset: { x: number; y: number };
};


export function MessageCard({ message, roomId, panOffset }: MessageCardProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [position, setPosition] = useState(message.position);
  const [size, setSize] = useState(message.size || { width: 256, height: 128 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [timeAgo, setTimeAgo] = useState('');

  const cardRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const resizeStartRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const isOwner = user?.uid === message.userId;
  
  const isDataUrl = message.file?.url.startsWith('data:');
  // Check for both Cloudinary's 'image' resource_type and standard MIME types like 'image/jpeg'
  const isImage = message.file?.type.startsWith('image');
  
  let downloadHref = message.file?.url || '';
  // For Cloudinary URLs, add the attachment flag to force download instead of opening in a new tab.
  if (message.file && !isDataUrl) {
    downloadHref = downloadHref.replace('/upload/', '/upload/fl_attachment/');
  }


  // Effect for updating the 'time ago' string
  useEffect(() => {
    if (!message.createdAt) {
      setTimeAgo('только что');
      return;
    }

    const update = () => {
      setTimeAgo(
        formatDistanceToNow(message.createdAt.toDate(), {
          addSuffix: true,
          locale: ru,
        })
      );
    };

    update();
    const intervalId = setInterval(update, 60000);

    return () => clearInterval(intervalId);
  }, [message.createdAt]);

  // Effect for syncing position from props
  useEffect(() => {
    if (!isDragging) {
      setPosition(message.position);
    }
  }, [message.position, isDragging]);

  // Effect for syncing size from props
  useEffect(() => {
    if (!isResizing) {
      setSize(message.size || { width: 256, height: 128 });
    }
  }, [message.size, isResizing]);

  const handleGripPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isOwner) return;
    e.stopPropagation();
    e.preventDefault();
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleGripPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isOwner || !dragStartRef.current || isDragging) return;
    e.stopPropagation();

    const dx = Math.abs(e.clientX - dragStartRef.current.x);
    const dy = Math.abs(e.clientY - dragStartRef.current.y);

    if (dx > 5 || dy > 5) {
      if (!cardRef.current) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      const rect = cardRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      setIsDragging(true);
      cardRef.current.setPointerCapture(e.pointerId);

      dragStartRef.current = null;
    }
  };

  const handleGripPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isOwner) return;
    e.stopPropagation();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (dragStartRef.current) {
      setIsCollapsed((p) => !p);
    }
    dragStartRef.current = null;
  };

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !isOwner) return;
    e.preventDefault();
    const board = document.getElementById('board');
    if (!board) return;

    const boardRect = board.getBoundingClientRect();

    const newWorldX =
      e.clientX - boardRect.left - panOffset.x - dragOffset.current.x;
    const newWorldY =
      e.clientY - boardRect.top - panOffset.y - dragOffset.current.y;

    setPosition({ x: newWorldX, y: newWorldY });
  };

  const handleCardPointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !isOwner || !firestore) {
      if (isDragging) {
        setIsDragging(false);
        cardRef.current?.releasePointerCapture(e.pointerId);
      }
      return;
    }

    cardRef.current?.releasePointerCapture(e.pointerId);

    try {
      if (
        position.x !== message.position.x ||
        position.y !== message.position.y
      ) {
        const messageDocRef = doc(
          firestore,
          'rooms',
          roomId,
          'messages',
          message.id
        );
        await updateDoc(messageDocRef, { position: position });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: `Не удалось обновить позицию: ${getErrorMessage(error)}`,
        variant: 'destructive',
      });
      setPosition(message.position);
    } finally {
      setIsDragging(false);
    }
  };

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isOwner) return;
    e.stopPropagation();
    e.preventDefault();

    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: cardRef.current?.offsetWidth || size.width,
      height: cardRef.current?.offsetHeight || size.height,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  useEffect(() => {
    const handlePointerMoveGlobal = (e: PointerEvent) => {
      if (!isResizing || !resizeStartRef.current) return;

      const dx = e.clientX - resizeStartRef.current.x;
      const dy = e.clientY - resizeStartRef.current.y;

      const newWidth = Math.max(150, resizeStartRef.current.width + dx);
      const newHeight = Math.max(100, resizeStartRef.current.height + dy);

      setSize({ width: newWidth, height: newHeight });
    };

    const handlePointerUpGlobal = async () => {
      if (!isResizing) return;

      if (!isOwner || !firestore) {
        setIsResizing(false);
        resizeStartRef.current = null;
        return;
      }

      const originalSize = message.size || { width: 256, height: 128 };
      if (
        size.width === originalSize.width &&
        size.height === originalSize.height
      ) {
        setIsResizing(false);
        resizeStartRef.current = null;
        return;
      }

      try {
        const messageDocRef = doc(
          firestore,
          'rooms',
          roomId,
          'messages',
          message.id
        );
        await updateDoc(messageDocRef, { size: size });
      } catch (error) {
        toast({
          title: 'Ошибка',
          description: `Не удалось обновить размер: ${getErrorMessage(error)}`,
          variant: 'destructive',
        });
        setSize(message.size || { width: 256, height: 128 });
      } finally {
        setIsResizing(false);
        resizeStartRef.current = null;
      }
    };

    if (isResizing) {
      window.addEventListener('pointermove', handlePointerMoveGlobal);
      window.addEventListener('pointerup', handlePointerUpGlobal);
      window.addEventListener('pointercancel', handlePointerUpGlobal);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMoveGlobal);
      window.removeEventListener('pointerup', handlePointerUpGlobal);
      window.removeEventListener('pointercancel', handlePointerUpGlobal);
    };
  }, [
    isResizing,
    firestore,
    isOwner,
    message.id,
    roomId,
    size,
    toast,
    message.size,
  ]);

  const handleCopy = () => {
    if (!message.text) return;
    navigator.clipboard
      .writeText(message.text)
      .then(() => {
        toast({ title: 'Скопировано' });
      })
      .catch((err) => {
        toast({
          title: 'Ошибка',
          description: 'Не удалось скопировать текст.',
          variant: 'destructive',
        });
      });
  };


  return (
    <>
      <Card
        ref={cardRef}
        data-message-card="true"
        className={cn(
          'absolute rounded-lg shadow-lg transition-shadow duration-300 flex flex-col pointer-events-auto',
          isOwner && 'cursor-grab',
          isDragging && 'cursor-grabbing shadow-2xl z-30 scale-105',
          isResizing && 'z-30'
        )}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
          touchAction: 'none',
        }}
        onPointerMove={handleCardPointerMove}
        onPointerUp={handleCardPointerUp}
        onPointerCancel={handleCardPointerUp}
      >
        <div className="relative p-4 flex flex-col gap-2 flex-grow overflow-y-auto">
          {message.file && !isCollapsed && (
            isImage ? (
                <div className="relative w-full rounded-md overflow-hidden mb-2 group">
                    <img 
                        src={message.file.url} 
                        alt={message.file.name} 
                        className="w-full h-auto object-contain max-h-96"
                    />
                    <a 
                        href={downloadHref} 
                        download={isDataUrl ? message.file.name : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {e.stopPropagation()}}
                        title="Скачать изображение"
                    >
                        <Download className="h-4 w-4" />
                    </a>
                </div>
            ) : (
             <div className="flex items-center gap-3 p-2 rounded-md border bg-background mb-2">
                <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{message.file.name}</p>
                     <a
                        href={downloadHref}
                        download={isDataUrl ? message.file.name : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Download className="h-3 w-3" />
                        Скачать
                    </a>
                </div>
             </div>
            )
          )}

          <div className="flex items-start gap-2">
            {isOwner && (
              <div className="flex flex-col gap-2">
                <div
                  className="p-1 text-muted-foreground/50 hover:text-muted-foreground touch-none cursor-pointer"
                  onPointerDown={handleGripPointerDown}
                  onPointerMove={handleGripPointerMove}
                  onPointerUp={handleGripPointerUp}
                  onPointerCancel={handleGripPointerUp}
                  title="Перетащить / Свернуть"
                >
                  <GripVertical className="h-5 w-5" />
                </div>
              </div>
            )}

            {!isOwner && !isCollapsed && <div className="w-9 shrink-0"></div>}

            <div className="flex-1 min-w-0 overflow-y-auto">
              {!isCollapsed ? (
                message.text?.trim() === '<3' && !message.file ? (
                  <div className="flex w-full items-center justify-center">
                    <span className="text-5xl">❤️</span>
                  </div>
                ) : message.text ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {renderFormattedText(message.text)}
                  </p>
                ) : null
              ) : (
                <div className="flex items-center justify-center text-xs text-muted-foreground italic">
                  Сообщение свёрнуто...
                </div>
              )}
            </div>

            {!isCollapsed && message.text && (
              <div
                className="py-1 text-muted-foreground/50 hover:text-muted-foreground cursor-pointer"
                onClick={handleCopy}
                title="Скопировать текст"
              >
                <Copy className="h-5 w-5" />
              </div>
            )}
          </div>
          {!isCollapsed && timeAgo && (
            <div className="mt-auto text-xs text-muted-foreground pt-1 border-t shrink-0">
              <span>{timeAgo}</span>
            </div>
          )}
        </div>


        {isOwner && (
          <div
            data-resize-handle="true"
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-primary/20 hover:bg-primary/50 transition-colors rounded-br-lg"
            onPointerDown={handleResizePointerDown}
          />
        )}
      </Card>
    </>
  );
}
