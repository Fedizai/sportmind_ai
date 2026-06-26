
"use client";

import { useState } from "react";
import { useAllUsers, type UserRole } from "@/hooks/use-all-users";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Mail, Cake, Dumbbell, Trophy, User as UserIcon, Eye, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser } from "@/hooks/use-user";
import { TennisBallIcon } from "@/components/icons";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/use-translation";

export default function AdminPage() {
    const { users, isLoading, error, updateUserRole } = useAllUsers();
    const { user: adminUser } = useUser();
    const { t } = useTranslation();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");

    const filteredUsers = users.filter(user =>
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
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

    const handleRoleChange = (uid: string, newRole: UserRole) => {
        updateUserRole(uid, newRole);
    }
    
    if (adminUser?.role !== 'admin') {
         return (
             <div className="flex items-center justify-center h-full">
                <p className="text-destructive">{t('accessDenied')}</p>
            </div>
         )
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                {t('userManagement')}
                </h1>
                <p className="text-muted-foreground">
                {t('userManagementDescription')}
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('allUsers')}</CardTitle>
                    <div className="relative pt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder={t('adminSearchUserPlaceholder')}
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {isLoading && Array.from({ length: 6 }).map((_, i) => (
                            <Card key={i}>
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <Skeleton className="h-16 w-16 rounded-full"/>
                                    <div className="space-y-2">
                                        <Skeleton className="h-5 w-32"/>
                                        <Skeleton className="h-4 w-48"/>
                                    </div>
                                </CardHeader>
                                <CardContent><Skeleton className="h-24 w-full"/></CardContent>
                                <CardFooter><Skeleton className="h-10 w-full"/></CardFooter>
                            </Card>
                        ))}
                        {!isLoading && filteredUsers.map(user => (
                            <Card key={user.uid} className="flex flex-col">
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <Avatar className="h-16 w-16">
                                        <AvatarImage src={`https://placehold.co/128x128.png`} alt={user.displayName || 'User'} data-ai-hint="user portrait" />
                                        <AvatarFallback>{user.displayName?.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow">
                                        <CardTitle className="text-xl">{user.displayName}</CardTitle>
                                        <CardDescription className="flex items-center gap-2"><Mail className="h-4 w-4"/>{user.email}</CardDescription>
                                    </div>
                                    {getRoleBadge(user.role)}
                                </CardHeader>
                                <CardContent className="flex-grow space-y-4">
                                    <div className="text-sm space-y-2">
                                        <div className="flex items-center gap-2"><Cake className="h-4 w-4 text-muted-foreground" /> <strong>{t('age')}:</strong> {user.age || 'N/A'}</div>
                                        <div className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-muted-foreground" /> <strong>{t('mainGoal')}:</strong> <span className="capitalize">{user.mainGoal?.replace('_', ' ') || 'N/A'}</span></div>
                                    </div>
                                    <Separator />
                                    <div className="space-y-2">
                                        <h4 className="font-semibold">{t('sportsAndProfiles')}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {user.sports?.map(sport => <Badge key={sport} variant="secondary" className="capitalize">{t(sport as any)}</Badge>)}
                                        </div>
                                        {user.footballProfile && (
                                            <div className="text-xs p-2 bg-muted rounded-md"><Trophy className="h-3 w-3 inline mr-1"/> <strong>{t('footballProfile')}:</strong> Position {user.footballProfile.position}, {user.footballProfile.inClub ? t('inAClub') : t('notInAClub')}.</div>
                                        )}
                                        {user.gymProfile && (
                                            <div className="text-xs p-2 bg-muted rounded-md"><Dumbbell className="h-3 w-3 inline mr-1"/> <strong>{t('gymProfile')}:</strong> {user.gymProfile.height}cm, {user.gymProfile.weight}kg. Goal: {user.gymProfile.goal?.replace('_', ' ')}.</div>
                                        )}
                                        {user.tennisProfile && (
                                            <div className="text-xs p-2 bg-muted rounded-md"><TennisBallIcon className="h-3 w-3 inline mr-1"/> <strong>{t('tennisProfile')}:</strong> {user.tennisProfile.level} level. {user.tennisProfile.ranking ? `Ranking: ${user.tennisProfile.ranking}` : ''}</div>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="grid grid-cols-2 gap-2">
                                    <div className="w-full">
                                        <Label className="text-xs text-muted-foreground">{t('changeRole')}</Label>
                                        <Select
                                            value={user.role}
                                            onValueChange={(newRole: UserRole) => handleRoleChange(user.uid, newRole)}
                                            disabled={user.uid === adminUser?.uid}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="player">{t('player')}</SelectItem>
                                                <SelectItem value="coach">{t('coach')}</SelectItem>
                                                <SelectItem value="admin">{t('admin')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-full">
                                        <Label className="text-xs text-muted-foreground">View Dashboard</Label>
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => router.push('/dashboard')}
                                            disabled={user.uid === adminUser?.uid}
                                        >
                                            <Eye className="mr-2 h-4 w-4" /> As Player
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>
            {error && <p className="text-destructive mt-4">Error loading users: {error.message}</p>}
        </div>
    )
}
