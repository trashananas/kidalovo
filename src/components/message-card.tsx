'use client';

import type { Message } from '@/types';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { cn, getErrorMessage } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { GripVertical, Copy, File as FileIcon, Download, Pencil, Loader2, Trash2, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PineappleBadge } from './pineapple-badge';
import { Progress } from './ui/progress';

const renderFormattedText = (text: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  const replacer = (str: string) => {
    let processed = str.replace(/_=/g, '≡');
    processed = processed.replace(/<3/g, '❤️');
    
    const greekMap: Record<string, string> = {
      pi: 'π', Pi: 'Π', PI: 'Π',
      alpha: 'α', Alpha: 'Α', ALPHA: 'Α',
      beta: 'β', Beta: 'Β', BETA: 'Β',
      gamma: 'γ', Gamma: 'Γ', GAMMA: 'Γ',
      delta: 'δ', Delta: 'Δ', DELTA: 'Δ',
      phi: 'φ', Phi: 'Φ', PHI: 'Φ',
      omega: 'ω', Omega: 'Ω', OMEGA: 'Ω',
      theta: 'θ', Theta: 'Θ', THETA: 'Θ',
      sigma: 'σ', Sigma: 'Σ', SIGMA: 'Σ'
    };

    const greekRegex = /(?<![a-zA-Zа-яА-Я])(alpha|beta|gamma|delta|phi|omega|theta|sigma|pi)(?![a-zA-Zа-яА-Я])/gi;
    processed = processed.replace(greekRegex, (match) => {
      return greekMap[match] || greekMap[match.toLowerCase()] || match;
    });

    return processed;
  };

  const regex = new RegExp('(@(.*?)\\@\\{(.*?)\\})|(?<![\\wа-яА-Я])(\\*([^*].*?[^*]|[^\\s*])\\*)(?![\\wа-яА-Я])|(?<![\\wа-яА-Я])(\\\\([^\\\\]*?)\\\\)(?![\\wа-яА-Я])|(?<![\\wа-яА-Я])(_([^_]*?)_)(?![\\wа-яА-Я])|(?<![\\wа-яА-Я])(\\$([^$]*?)\\$)(?![\\wа-яА-Я])|(?<![\\wа-яА-Я])(\\#([^#]*?)\\#)(?![\\wа-яА-Я])|((?:https?://|www\\.)[^\\s]+)', 'g');

  let match;
  while ((match = regex.exec(text)) !== null) {
    const startIndex = match.index;
    if (startIndex > lastIndex) nodes.push(replacer(text.substring(lastIndex, startIndex)));

    if (match[2] !== undefined && match[3] !== undefined) {
      nodes.push(<a key={lastIndex} href={match[3]} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" onClick={(e) => e.stopPropagation()}>{replacer(match[2])}</a>);
    } else if (match[5] !== undefined) nodes.push(<strong key={lastIndex}>{replacer(match[5])}</strong>);
    else if (match[7] !== undefined) nodes.push(<em key={lastIndex}>{replacer(match[7])}</em>);
    else if (match[9] !== undefined) nodes.push(<u key={lastIndex}>{replacer(match[9])}</u>);
    else if (match[11] !== undefined) nodes.push(<s key={lastIndex}>{replacer(match[11])}</s>);
    else if (match[14] !== undefined) {
      const url = match[14].startsWith('www.') ? `http://${match[14]}` : match[14];
      nodes.push(<a key={lastIndex} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" onClick={(e) => e.stopPropagation()}>{replacer(match[14])}</a>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(replacer(text.substring(lastIndex)));
  return nodes;
};

type MessageCardProps = {
  message: Message;
  roomId: string;
  panOffset: { x: number; y: number };
  isRoomOwner: boolean;
  roomMembers?: Record<string, { role: string; name: string }>;
};

export function MessageCard({ message, roomId, panOffset, isRoomOwner, roomMembers }: MessageCardProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [position, setPosition] = useState(message.position);
  const [size, setSize] = useState(message.size || { width: 320, height: message.file ? 170 : 140 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [timeAgo, setTimeAgo] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const lastDeleteClickRef = useRef<number>(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number; } | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const isGlobalAdmin = user?.email === 'ananas@kidalovo.internal';
  const isAuditLog = message.type === 'audit';
  const isOwner = isAuditLog 
    ? isGlobalAdmin 
    : ((user?.uid === message.userId) || (isRoomOwner && user && !user.isAnonymous) || isGlobalAdmin);

  useEffect(() => { setPosition(message.position); }, [message.position]);
  useEffect(() => { if (message.size) setSize(message.size); }, [message.size]);

  useEffect(() => {
    if (!message.createdAt) { setTimeAgo('только что'); return; }
    const update = () => {
      try { setTimeAgo(formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true, locale: ru })); } catch { setTimeAgo('только что'); }
    };
    update();
    const intervalId = setInterval(update, 60000);
    return () => clearInterval(intervalId);
  }, [message.createdAt]);

  const handleGripPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isOwner) return;
    e.stopPropagation();
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    cardRef.current.setPointerCapture(e.pointerId);
  };

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isOwner || isEditing) return;
    if (!isDragging && dragStartRef.current) {
      const dx = Math.abs(e.clientX - dragStartRef.current.x);
      const dy = Math.abs(e.clientY - dragStartRef.current.y);
      if (dx > 5 || dy > 5) setIsDragging(true);
    }
    if (isDragging) {
      const board = document.getElementById('board');
      if (!board) return;
      const boardRect = board.getBoundingClientRect();
      setPosition({
        x: e.clientX - boardRect.left - panOffset.x - dragOffset.current.x,
        y: e.clientY - boardRect.top - panOffset.y - dragOffset.current.y,
      });
    }
  };

  const handleCardPointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current && !isDragging && !isResizing) setIsCollapsed((p) => !p);
    dragStartRef.current = null;
    if (isDragging && isOwner) {
      cardRef.current?.releasePointerCapture(e.pointerId);
      setIsDragging(false);
      if (firestore) {
        try {
          const messageDocRef = doc(firestore, 'rooms', roomId, 'messages', message.id);
          await updateDoc(messageDocRef, { position });
        } catch (error) { toast({ title: 'Ошибка', description: getErrorMessage(error), variant: 'destructive' }); }
      }
    }
  };

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isOwner) return;
    e.stopPropagation(); e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = { x: e.clientX, y: e.clientY, width: cardRef.current?.offsetWidth || size.width, height: cardRef.current?.offsetHeight || size.height };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!isResizing || !resizeStartRef.current) return;
      setSize({
        width: Math.max(150, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x)),
        height: Math.max(100, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y)),
      });
    };
    const up = async () => {
      if (!isResizing || !firestore || !isOwner) { setIsResizing(false); return; }
      try {
        const ref = doc(firestore, 'rooms', roomId, 'messages', message.id);
        await updateDoc(ref, { size });
      } catch (error) { toast({ title: 'Ошибка', description: getErrorMessage(error), variant: 'destructive' }); }
      finally { setIsResizing(false); resizeStartRef.current = null; }
    };
    if (isResizing) { window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); }
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [isResizing, size, message.id, roomId, firestore, isOwner]);

  const handleDelete = () => {
    if (!firestore || !isOwner || isDeleting) return;
    setIsDeleting(true);
    const ref = doc(firestore, 'rooms', roomId, 'messages', message.id);
    updateDoc(ref, { isDeleted: true }).catch((err) => {
      toast({ title: 'Ошибка', description: getErrorMessage(err), variant: 'destructive' });
    }).finally(() => setIsDeleting(false));
  };

  const handleSaveEdit = () => {
    if (!firestore || !isOwner || editText.trim() === message.text) { setIsEditing(false); return; }
    setIsSavingEdit(true);
    const ref = doc(firestore, 'rooms', roomId, 'messages', message.id);
    updateDoc(ref, { text: editText, updatedAt: serverTimestamp() }).then(() => setIsEditing(false)).catch((err) => {
      toast({ title: 'Ошибка', description: getErrorMessage(err), variant: 'destructive' });
    }).finally(() => setIsSavingEdit(false));
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!message.file || !firestore || message.file.isUploading) return;
    setIsDownloading(true);

    try {
      const { url, fileId, name, totalChunks } = message.file;
      let finalBase64 = '';

      if (url) {
        finalBase64 = url;
      } else if (fileId && totalChunks) {
        const chunksCol = collection(firestore, 'rooms', roomId, 'file_chunks', fileId, 'chunks');
        const q = query(chunksCol, orderBy('index', 'asc'));
        const snap = await getDocs(q);
        snap.docs.forEach(d => { finalBase64 += d.data().data.split(',')[1] || d.data().data; });
        if (!finalBase64.startsWith('data:')) finalBase64 = `data:${message.file.type};base64,${finalBase64}`;
      }

      const link = document.createElement('a');
      link.href = finalBase64;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast({ title: 'Ошибка скачивания', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setIsDownloading(false);
    }
  };

  const isAuthorAdmin = message.authorLogin?.toLowerCase() === 'ananas';
  const isFileUploading = message.file?.isUploading;
  const uploadProgress = (message.file?.totalChunks && message.file?.uploadedChunks !== undefined) 
    ? Math.round((message.file.uploadedChunks / message.file.totalChunks) * 100) 
    : 0;

  return (
    <Card
      ref={cardRef}
      className={cn(
        'absolute rounded-lg shadow-lg flex flex-col pointer-events-auto transition-transform',
        isOwner && !isEditing && 'cursor-grab',
        isDragging && 'z-50 scale-105 shadow-2xl cursor-grabbing',
        isAuditLog && 'border-primary border-2 bg-primary/5'
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: isEditing ? 'auto' : (isCollapsed ? '60px' : `${size.height}px`),
        touchAction: 'none'
      }}
      onPointerMove={handleCardPointerMove}
      onPointerUp={handleCardPointerUp}
      data-message-card="true"
    >
      <div className="relative p-4 flex flex-col gap-2 flex-grow overflow-hidden h-full">
        <div className="flex justify-between items-start shrink-0">
          {isAuditLog ? (
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary">Список участников</div>
            </div>
          ) : (
             message.authorName && !isCollapsed && (
              <div className="flex items-center gap-1 mb-1">
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: message.authorColor || 'inherit' }}>
                  от {message.authorName}
                </div>
                {isAuthorAdmin && <PineappleBadge className="h-3 w-3" />}
              </div>
            )
          )}
          
          {!isCollapsed && !isEditing && (
            <div className="flex gap-1 ml-auto">
              {!isAuditLog && (
                <div className="p-1 text-muted-foreground/50 hover:text-muted-foreground cursor-pointer" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(message.text || ''); toast({ title: "Скопировано!" }); }} title="Копировать">
                  <Copy className="h-4 w-4" />
                </div>
              )}
              {isOwner && (
                <div className="p-1 text-muted-foreground/50 hover:text-muted-foreground cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} title="Изменить">
                  <Pencil className="h-4 w-4" />
                </div>
              )}
              {isOwner && (
                <div className="p-1 text-destructive/50 hover:text-destructive cursor-pointer" onClick={(e) => { e.stopPropagation(); const now = Date.now(); if (now - lastDeleteClickRef.current < 500) handleDelete(); else toast({ title: "Удаление", description: "Нажмите еще раз для подтверждения" }); lastDeleteClickRef.current = now; }} title="Удалить">
                  <Trash2 className="h-4 w-4" />
                </div>
              )}
            </div>
          )}
        </div>
        
        {message.file && !isCollapsed && !isAuditLog && (
          <div className="relative group/file mb-2 shrink-0">
            {isFileUploading ? (
              <div className="flex flex-col gap-2 p-3 border rounded-md bg-muted/30">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-xs font-medium">Загрузка файла: {uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1.5" />
              </div>
            ) : (
              message.file.type.startsWith('image') && message.file.url ? (
                <div className="relative">
                  <img src={message.file.url} alt={message.file.name} className="w-full h-auto max-h-48 rounded-md object-contain pointer-events-none" />
                  <div className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur-sm rounded-md shadow-sm opacity-0 group-hover/file:opacity-100 transition-opacity hover:bg-primary hover:text-primary-foreground cursor-pointer" onClick={handleDownload} title="Скачать">
                    {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-2 rounded-md border bg-muted/20 hover:bg-muted/30 transition-colors">
                  <FileIcon className="h-6 w-6 text-muted-foreground" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs truncate font-medium">{message.file.name}</span>
                    <span className="text-[10px] text-muted-foreground">{(message.file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <div className="p-1.5 bg-background rounded-md shadow-sm hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer" onClick={handleDownload} title="Скачать">
                    {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        <div className="flex items-start gap-2 flex-grow min-h-0">
          {isOwner && !isEditing && (
            <div className="p-1 text-muted-foreground/50 hover:text-muted-foreground cursor-pointer shrink-0" onPointerDown={handleGripPointerDown}>
              <GripVertical className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1 min-w-0 overflow-y-auto pr-1 custom-scrollbar h-full">
            {isEditing ? (
              <div className="flex flex-col gap-2">
                <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="text-sm" rows={2} autoFocus />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Отмена</Button>
                  <Button size="sm" onClick={handleSaveEdit}>{isSavingEdit ? <Loader2 className="animate-spin" /> : 'ОК'}</Button>
                </div>
              </div>
            ) : isCollapsed ? (
              <div className="text-xs italic text-muted-foreground truncate opacity-70">
                {isAuditLog ? 'Тут были...' : (isFileUploading ? `Загрузка... ${uploadProgress}%` : (message.text || 'Файл...'))}
              </div>
            ) : isAuditLog ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Тут были:</p>
                <ul className="text-sm space-y-1 pl-2">
                   {roomMembers ? Object.values(roomMembers).map((m: any, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        {m.name} {m.role === 'owner' && <span className="text-[10px] text-muted-foreground font-bold">(создатель)</span>}
                      </li>
                   )) : <li>Загрузка списка...</li>}
                </ul>
              </div>
            ) : (
              <div className="text-sm whitespace-pre-wrap break-words">{renderFormattedText(message.text || '')}</div>
            )}
          </div>
        </div>

        {!isCollapsed && !isEditing && !isAuditLog && (
          <div className="mt-auto text-[10px] text-muted-foreground pt-1 border-t flex justify-between shrink-0">
            <span>{timeAgo}{message.updatedAt ? ' (отред.)' : ''}</span>
          </div>
        )}
      </div>
      {isOwner && !isCollapsed && (
        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize hover:bg-primary/20 transition-colors rounded-br-lg z-10" onPointerDown={handleResizePointerDown} data-resize-handle="true" />
      )}
    </Card>
  );
}
