
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAllUsers, type UserRole } from "@/hooks/use-all-users";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/use-translation";

export default function AllUsersPage() {
  const { users, isLoading, error } = useAllUsers();
  const [search, setSearch] = useState("");
  const { t } = useTranslation();

  const filteredUsers = users.filter(user => 
    user.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
        case 'admin':
            return <Badge variant="destructive" className="capitalize">{t('admin')}</Badge>;
        case 'coach':
            return <Badge variant="secondary" className="capitalize">{t('coach')}</Badge>;
        case 'player':
            return <Badge className="capitalize">{t('player')}</Badge>;
        default:
            return <Badge variant="outline">{t('unknown')}</Badge>;
    }
  };
  
  const renderLoadingState = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, index) => (
            <Card key={index}>
                <CardContent className="p-4 flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-grow space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                </CardContent>
            </Card>
        ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
          <Users2 className="h-8 w-8 text-primary" />
          {t('allUsers')}
        </h1>
        <p className="text-muted-foreground">
          {t('allUsersDescription')}
        </p>
      </div>

      <Card>
          <CardHeader>
              <CardTitle>{t('userDirectory')}</CardTitle>
              <CardDescription>{t('userDirectoryDescription')}</CardDescription>
               <div className="relative pt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder={t('searchUsers')}
                        className="pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
          </CardHeader>
          <CardContent>
            {isLoading ? renderLoadingState() : 
             error ? <p className="text-destructive">Error loading users: {error.message}</p> :
             filteredUsers.length === 0 ? <p className="text-muted-foreground text-center py-8">{t('noUsersFound')}</p> :
             (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredUsers.map(user => (
                    <Card key={user.uid} className="hover:border-primary transition-colors group">
                        <CardContent className="p-4 flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={`https://placehold.co/128x128.png?text=${user.displayName?.charAt(0)}`} alt={user.displayName || 'User'} data-ai-hint="user portrait" />
                                <AvatarFallback>{user.displayName?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div className="flex-grow space-y-1 overflow-hidden">
                                <h3 className="font-semibold truncate">{user.displayName}</h3>
                                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                                {getRoleBadge(user.role)}
                            </div>
                        </CardContent>
                    </Card>
                ))}
             </div>)}
          </CardContent>
      </Card>
    </div>
  );
}
