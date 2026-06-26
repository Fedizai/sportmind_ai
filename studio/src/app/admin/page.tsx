
"use client";

import { useState } from "react";
import { useAllUsers, type UserRole, type UserPlan } from "@/hooks/use-all-users";
import { useUser } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Mail, Cake, Dumbbell, Trophy, User as UserIcon, Eye, Search, Loader2, UserPlus, FileQuestion, Star, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TennisBallIcon } from "@/components/icons";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
    DialogClose
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { deleteUser, createUser } from "./actions";
import { useTranslation } from "@/hooks/use-translation";
import { useAdminPreviewStore } from "@/stores/admin-preview-store";

const SUPER_ADMIN_EMAILS = ['khaled05062006@gmail.com', 'fedizayen12@gmail.com'];

const createUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6, "Password should be at least 6 characters"),
    displayName: z.string().min(1, "Display name is required"),
    role: z.enum(["player", "coach", "admin"]),
    plan: z.enum(["athlete", "pro"])
});

export default function AdminPage() {
    const { users, isLoading, error, updateUserRole, updateUserPlan } = useAllUsers();
    const { user: adminUser } = useUser();
    const { startUserPreview } = useAdminPreviewStore();
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);

    const createUserForm = useForm<z.infer<typeof createUserSchema>>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            email: "",
            password: "",
            displayName: "",
            role: "player",
            plan: "athlete"
        },
    });

    const filteredUsers = users.filter(user =>
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const handleCreateUser = async (values: z.infer<typeof createUserSchema>) => {
        try {
            const result = await createUser(values);
            toast({
                title: "Success",
                description: result.message,
            });
            createUserForm.reset();
            setIsCreateUserOpen(false);
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Creation Failed",
                description: error.message || "An unexpected error occurred.",
            });
        }
    }

    const getRoleBadge = (role: UserRole) => {
        switch (role) {
            case 'admin':
                return <Badge variant="destructive" className="capitalize">{t('admin')}</Badge>;
            case 'coach':
                return <Badge variant="secondary" className="capitalize">{t('coach')}</Badge>;
            case 'player':
                return <Badge className="capitalize">{t('player')}</Badge>;
            default:
                return <Badge variant="outline">Unknown</Badge>;
        }
    };
    
    const getPlanBadge = (plan: UserPlan | undefined) => {
        switch (plan) {
            case 'pro':
                return <Badge className="bg-yellow-400 text-black capitalize flex items-center gap-1"><Star className="h-3 w-3" />{plan}</Badge>;
            case 'athlete':
                return <Badge variant="outline" className="capitalize">{plan}</Badge>;
            default:
                return <Badge variant="outline">N/A</Badge>;
        }
    };

    const handleRoleChange = (uid: string, email: string | null, newRole: UserRole) => {
        if (email && SUPER_ADMIN_EMAILS.includes(email)) {
            toast({
                variant: "destructive",
                title: "Action Not Allowed",
                description: "This account always stays an admin and cannot be changed.",
            });
            return;
        }
        updateUserRole(uid, newRole);
    }

    const handlePlanChange = (uid: string, newPlan: UserPlan) => {
        updateUserPlan(uid, newPlan);
    }

    const handleViewAsUser = (user: { uid: string; displayName: string | null; email: string | null }) => {
        startUserPreview({ uid: user.uid, displayName: user.displayName, email: user.email });
        router.push('/dashboard');
    }
    
    const handleDeleteUser = async (uid: string, displayName: string | null) => {
        setIsDeleting(uid);
        try {
            await deleteUser(uid);
            toast({
                title: "User Deleted",
                description: `${displayName || 'The user'} has been permanently deleted.`,
            });
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: error.message || "An unexpected error occurred.",
            });
        } finally {
            setIsDeleting(null);
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-16 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
                    <Shield className="h-8 w-8 text-primary" />
                    {t('userManagement')}
                    </h1>
                    <p className="text-muted-foreground">
                    {t('userManagementDescription')}
                    </p>
                </div>
                <div className="flex gap-2">
                     <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                        <DialogTrigger asChild>
                            <Button><UserPlus className="mr-2 h-4 w-4" />Create New User</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create a New User</DialogTitle>
                                <DialogDescription>
                                    Fill out the form below to create a new user account. An email will not be sent.
                                </DialogDescription>
                            </DialogHeader>
                            <Form {...createUserForm}>
                                <form onSubmit={createUserForm.handleSubmit(handleCreateUser)} className="space-y-4">
                                    <FormField control={createUserForm.control} name="displayName" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder={t('fullNamePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={createUserForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder={t('emailPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={createUserForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder={t('passwordPlaceholder')} /></FormControl><FormMessage /></FormItem>)} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={createUserForm.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="player">Player</SelectItem><SelectItem value="coach">Coach</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                        <FormField control={createUserForm.control} name="plan" render={({ field }) => (<FormItem><FormLabel>Plan</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="athlete">Athlete</SelectItem><SelectItem value="pro">Pro</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button type="button" variant="secondary">Cancel</Button>
                                        </DialogClose>
                                        <Button type="submit" disabled={createUserForm.formState.isSubmitting}>
                                            {createUserForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                            Create User
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
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
                                <CardFooter className="grid grid-cols-2 gap-2 w-full"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></CardFooter>
                            </Card>
                        ))}
                        {!isLoading && filteredUsers.map(user => (
                            <Card key={user.uid} className="flex flex-col">
                                <CardHeader className="flex flex-row items-start gap-4">
                                    <Avatar className="h-16 w-16">
                                        <AvatarImage src={`https://placehold.co/128x128.png`} alt={user.displayName || 'User'} data-ai-hint="user portrait" />
                                        <AvatarFallback>{user.displayName?.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow">
                                        <CardTitle className="text-xl">{user.displayName}</CardTitle>
                                        <CardDescription className="flex items-center gap-2"><Mail className="h-4 w-4"/>{user.email}</CardDescription>
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        {getRoleBadge(user.role)}
                                        {getPlanBadge(user.plan)}
                                    </div>
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
                                <CardFooter className="flex flex-col gap-2">
                                    <div className="grid grid-cols-2 gap-2 w-full">
                                        <div className="w-full">
                                            <Label className="text-xs text-muted-foreground">{t('changeRole')}</Label>
                                            <Select
                                                value={user.role}
                                                onValueChange={(newRole: UserRole) => handleRoleChange(user.uid, user.email, newRole)}
                                                disabled={user.uid === adminUser?.uid || (!!user.email && SUPER_ADMIN_EMAILS.includes(user.email))}
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
                                            <Label className="text-xs text-muted-foreground">Change Plan</Label>
                                            <Select
                                                value={user.plan}
                                                onValueChange={(newPlan: UserPlan) => handlePlanChange(user.uid, newPlan)}
                                                disabled={user.uid === adminUser?.uid}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="athlete">Athlete</SelectItem>
                                                    <SelectItem value="pro">Pro</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 w-full">
                                         <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => handleViewAsUser(user)}
                                            disabled={user.uid === adminUser?.uid}
                                        >
                                            <Eye className="mr-2 h-4 w-4" /> View as User
                                        </Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" className="w-full" disabled={user.uid === adminUser?.uid || isDeleting === user.uid}>
                                                    {isDeleting === user.uid ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                    )}
                                                    Delete User
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the user account for
                                                         <strong className="px-1">{user.displayName}</strong>
                                                        and remove their data from our servers.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteUser(user.uid, user.displayName)}>
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
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
