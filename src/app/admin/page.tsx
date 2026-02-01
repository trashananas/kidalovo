'use client';

import { useEffect, useState, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, Users, Home, Database, MessageSquare, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const isAnanas = user?.email === 'ananas@kidalovo.internal';

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !isAnanas) return null;
    return collection(firestore, 'users');
  }, [firestore, isAnanas]);

  const roomsQuery = useMemoFirebase(() => {
    if (!firestore || !isAnanas) return null;
    return query(collection(firestore, 'rooms'), orderBy('createdAt', 'desc'));
  }, [firestore, isAnanas]);

  const { data: usersData, isLoading: isUsersLoading } = useCollection(usersQuery);
  const { data: roomsData, isLoading: isRoomsLoading } = useCollection(roomsQuery);

  const [roomStats, setRoomStats] = useState<Record<string, { count: number, size: number }>>({});
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const hasAutoFetched = useRef(false);

  useEffect(() => {
    if (!isUserLoading && !isAnanas) {
      router.push('/');
    }
  }, [user, isUserLoading, isAnanas, router]);

  const fetchStats = async () => {
    if (!firestore || !roomsData) return;
    setIsStatsLoading(true);
    const newStats: Record<string, { count: number, size: number }> = {};

    for (const room of roomsData) {
      const msgsCol = collection(firestore, 'rooms', room.id, 'messages');
      try {
        const msgsSnap = await getDocs(msgsCol);
        let totalSize = 0;
        msgsSnap.docs.forEach(d => {
            const data = d.data();
            if (data.text) totalSize += data.text.length;
            if (data.file?.url) totalSize += data.file.url.length;
        });
        newStats[room.id] = {
          count: msgsSnap.size,
          size: Math.round(totalSize / 1024)
        };
      } catch (e: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: msgsCol.path,
          operation: 'list'
        }));
      }
    }
    setRoomStats(newStats);
    setIsStatsLoading(false);
  };

  useEffect(() => {
    if (roomsData && roomsData.length > 0 && !hasAutoFetched.current && !isRoomsLoading) {
      hasAutoFetched.current = true;
      fetchStats();
    }
  }, [roomsData, isRoomsLoading]);

  if (isUserLoading || !isAnanas) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-10 w-10" /></div>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-3xl font-bold">Панель администратора</h1>
          </div>
          <Button onClick={fetchStats} disabled={isStatsLoading || !roomsData}>
            {isStatsLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Database className="mr-2 h-4 w-4" />}
            Обновить статистику памяти
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Пользователей</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usersData?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Комнат</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roomsData?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего сообщений</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(roomStats).reduce((acc, curr) => acc + curr.count, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <Card>
            <CardHeader>
              <CardTitle>Зарегистрированные пользователи</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Никнейм</TableHead>
                    <TableHead>Логин</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersData?.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.username}</TableCell>
                      <TableCell>{u.login || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {isUsersLoading && <TableRow><TableCell colSpan={2} className="text-center py-4"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Список комнат</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Код</TableHead>
                    <TableHead>Дата создания</TableHead>
                    <TableHead className="text-right">МСГ</TableHead>
                    <TableHead className="text-right">КБ</TableHead>
                    <TableHead className="text-right">Вход</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roomsData?.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-bold">{r.id}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.createdAt ? format(r.createdAt.toDate(), 'dd.MM.yy HH:mm', { locale: ru }) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{roomStats[r.id]?.count ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{roomStats[r.id]?.size ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/${r.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {isRoomsLoading && <TableRow><TableCell colSpan={5} className="text-center py-4"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}