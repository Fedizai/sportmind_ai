

"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import ReactMarkdown from "react-markdown";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, Sparkles, Loader2, Plus, Clock, Trash2, Star, RefreshCw } from "lucide-react";
import { getAssistantResponse } from "@/ai/flows/assistant-flow";
import { useToast } from "@/hooks/use-toast";
import type { WorkoutPlanOutput, ExerciseFeedbackOutput } from "@/ai/schemas";
import { useChatHistoryStore, type ChatMessage, type SavedChat } from "@/stores/chat-history-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";

const formatWorkoutPlan = (plan: WorkoutPlanOutput) => {
  let markdown = "";
  if (plan && plan.plan) {
    plan.plan.forEach(day => {
      markdown += `\n\n### ${day.day}: ${day.focus}\n`;
      day.exercises.forEach(ex => {
        markdown += `- **${ex.name}**: ${ex.sets} sets of ${ex.reps} reps\n`;
      });
    });
  }
  return markdown;
};

const formatFormFeedback = (feedback: ExerciseFeedbackOutput) => {
  let markdown = "";
  if (feedback && feedback.feedback) {
    feedback.feedback.forEach(point => {
      markdown += `\n- **${point.point}**: ${point.explanation}\n`;
    });
  }
  return markdown;
};


function ConversationHistoryList({ conversations, isFavorites, onSelect, onLoad, onToggleFavorite, onDelete }: { conversations: SavedChat[], isFavorites: boolean, onSelect: (messages: ChatMessage[]) => void, onLoad: (messages: ChatMessage[]) => void, onToggleFavorite: (chat: SavedChat) => void, onDelete: (id: string) => void }) {
    const { favorites } = useChatHistoryStore();
    const { t } = useTranslation();
    return (
        <ScrollArea className="h-full">
            <div className="space-y-2 pr-4">
            {conversations.map((savedChat) => (
                <div key={savedChat.id} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                    <Button variant="ghost" className="w-full justify-start h-auto" onClick={() => onSelect(savedChat.messages)}>
                        <div className="text-left">
                            <p className="font-semibold truncate whitespace-normal text-wrap">{savedChat.messages.find(m => m.role === 'user')?.content || 'Conversation'}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(savedChat.timestamp), 'PPpp')}</p>
                        </div>
                    </Button>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onLoad(savedChat.messages)} title={t('loadChat')}>
                            <RefreshCw className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onToggleFavorite(savedChat)} title={t('toggleFavorite')}>
                            <Star className={cn("h-4 w-4", favorites['fitness-assistant']?.some(f => f.id === savedChat.id) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground")} />
                        </Button>
                         <Button variant="ghost" size="icon" onClick={() => onDelete(savedChat.id) } title={t('delete')}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                </div>
            ))}
            {conversations.length === 0 && (
                <p className="text-sm text-muted-foreground p-4 text-center">{isFavorites ? t('noFavoriteConversations') : t('noSavedConversations')}</p>
            )}
            </div>
        </ScrollArea>
    );
}

function HistoryDialog({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
    const { savedHistories, favorites, toggleFavorite, removeSavedHistory, removeFavorite, loadChat } = useChatHistoryStore();
    const { t } = useTranslation();
    const [selectedHistory, setSelectedHistory] = useState<ChatMessage[] | null>(null);

    const handleLoadChat = (messages: ChatMessage[]) => {
        loadChat('fitness-assistant', messages);
        onOpenChange(false); // Close dialog
    }

    return (
        <Dialog onOpenChange={(open) => { if (!open) { setSelectedHistory(null) } }}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon"><Clock className="h-5 w-5"/></Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t('conversationHistory')}</DialogTitle>
                    <DialogDescription>{t('conversationHistoryDescription')}</DialogDescription>
                </DialogHeader>
                 <Tabs defaultValue="history" className="flex-grow overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2 h-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="history">{t('history')}</TabsTrigger>
                            <TabsTrigger value="favorites">{t('favorites')}</TabsTrigger>
                        </TabsList>
                        <TabsContent value="history" className="m-0 h-full overflow-y-auto">
                           <ConversationHistoryList 
                                conversations={savedHistories['fitness-assistant'] || []} 
                                isFavorites={false}
                                onSelect={setSelectedHistory}
                                onLoad={handleLoadChat}
                                onToggleFavorite={(chat) => toggleFavorite('fitness-assistant', chat)}
                                onDelete={(id) => removeSavedHistory('fitness-assistant', id)}
                            />
                        </TabsContent>
                         <TabsContent value="favorites" className="m-0 h-full overflow-y-auto">
                           <ConversationHistoryList 
                                conversations={favorites['fitness-assistant'] || []} 
                                isFavorites={true}
                                onSelect={setSelectedHistory}
                                onLoad={handleLoadChat}
                                onToggleFavorite={(chat) => toggleFavorite('fitness-assistant', chat)}
                                onDelete={(id) => removeFavorite('fitness-assistant', id)}
                            />
                        </TabsContent>
                    </div>
                    <div className="h-full border-l pl-6 hidden md:block">
                        <ScrollArea className="h-full pr-4">
                            {selectedHistory ? (
                                <div className="space-y-4">
                                    {selectedHistory.map((message, index) => (
                                        <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                                            {message.role === 'ai' && <div className="p-1.5 bg-primary rounded-full text-primary-foreground"><Bot className="h-5 w-5" /></div>}
                                            <div className={`rounded-lg p-3 max-w-[90%] text-sm prose dark:prose-invert prose-p:my-1 prose-headings:my-1 ${message.role === 'ai' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                                                <ReactMarkdown>{message.content + (message.workoutPlan ? formatWorkoutPlan(message.workoutPlan) : '') + (message.formFeedback ? formatFormFeedback(message.formFeedback) : '')}</ReactMarkdown>
                                            </div>
                                            {message.role === 'user' && <div className="p-1.5 bg-secondary rounded-full text-secondary-foreground"><User className="h-5 w-5" /></div>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">{t('selectConversationToView')}</div>
                            )}
                        </ScrollArea>
                    </div>
                 </Tabs>
            </DialogContent>
        </Dialog>
    );
}


function FitnessAssistantChat() {
    const { toast } = useToast();
    const { t } = useTranslation();
    const searchParams = useSearchParams();
    const CHAT_ID = 'fitness-assistant';
    const { history, addMessage, startNewChat, isHydrated, addFavorite } = useChatHistoryStore();
    
    // Define initial message inside the component to access the t function
    const getInitialMessage = (): ChatMessage => ({ role: 'ai', content: t('aiFitnessCoachGreeting') });
    
    const messages = history[CHAT_ID] || [getInitialMessage()];

    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const hasProcessedInitialMessage = useRef(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    useEffect(() => {
        if (isHydrated && !history[CHAT_ID]) {
            startNewChat(CHAT_ID, getInitialMessage());
        }
    }, [isHydrated, history, startNewChat, CHAT_ID, t]);


    const processMessage = async (message: string) => {
        if (!message.trim()) return;

        const userMessage: ChatMessage = { role: 'user', content: message };
        addMessage(CHAT_ID, userMessage);
        setIsLoading(true);

        try {
            const assistantResponse = await getAssistantResponse({ message });
            
            if (!assistantResponse) {
                throw new Error("Received an empty response from the AI assistant.");
            }

            const aiMessage: ChatMessage = {
                role: 'ai',
                content: assistantResponse.response,
                workoutPlan: assistantResponse.workoutPlan,
                formFeedback: assistantResponse.formFeedback,
            };
            addMessage(CHAT_ID, aiMessage);

        } catch (error) {
            console.error("Error getting assistant response:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            toast({
                title: t('aiError'),
                description: `${t('tacticalCoachError')}: ${errorMessage}`,
                variant: "destructive",
            });
             addMessage(CHAT_ID, {role: 'ai', content: t('aiErrorResponse')});
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [messages]);

    useEffect(() => {
        const initialMessage = searchParams.get('message');
        if (initialMessage && !hasProcessedInitialMessage.current && isHydrated) {
            hasProcessedInitialMessage.current = true;
            processMessage(initialMessage);
        }
    }, [searchParams, isHydrated]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        const currentInput = input;
        setInput("");
        await processMessage(currentInput);
    }
    
    const handleSaveToFavorites = () => {
        const currentMessages = history[CHAT_ID];
        if (currentMessages && currentMessages.length > 1) {
            addFavorite(CHAT_ID, currentMessages);
            toast({
                title: t('conversationSavedTitle'),
                description: t('conversationSavedDescription'),
            });
        } else {
            toast({
                variant: 'destructive',
                title: t('cannotSaveTitle'),
                description: t('cannotSaveDescription'),
            });
        }
    };
    
    const handleStartNewChat = () => {
        startNewChat(CHAT_ID, getInitialMessage());
    };


    if (!isHydrated) {
        return (
             <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <Card className="flex flex-col h-full w-full">
            <CardHeader className="flex-shrink-0">
                <div className="flex flex-col gap-2">
                    {/* Top Row */}
                    <div className="flex justify-between items-start">
                        <CardTitle className="flex items-center gap-3 text-lg">
                            <Sparkles className="h-6 w-6 text-primary" />
                            {t('aiFitnessCoach')}
                        </CardTitle>
                        <div className="flex items-center">
                            <Button variant="ghost" size="icon" onClick={handleSaveToFavorites} title={t('saveConversation')}>
                                <Star className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleStartNewChat} title={t('newChat')}>
                                <Plus className="h-5 w-5"/>
                            </Button>
                        </div>
                    </div>
                    {/* Bottom Row */}
                    <div className="flex justify-between items-end">
                        <CardDescription className="text-sm">
                            {t('aiFitnessCoachDescription')}
                        </CardDescription>
                        <HistoryDialog onOpenChange={setIsHistoryOpen} />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow p-0 overflow-hidden">
                <ScrollArea className="h-full p-6" ref={scrollAreaRef}>
                    <div className="space-y-6">
                    {messages.map((message, index) => (
                        <div key={index} className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
                            {message.role === 'ai' && (
                                <div className="p-2 bg-primary rounded-full text-primary-foreground">
                                    <Bot className="h-6 w-6" />
                                </div>
                            )}
                            <div className={`rounded-lg p-4 max-w-[85%] prose prose-sm dark:prose-invert prose-p:my-2 prose-headings:my-2 ${message.role === 'ai' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                                <ReactMarkdown>
                                    {message.content + (message.workoutPlan ? formatWorkoutPlan(message.workoutPlan) : '') + (message.formFeedback ? formatFormFeedback(message.formFeedback) : '')}
                                </ReactMarkdown>
                            </div>
                            {message.role === 'user' && (
                                <div className="p-2 bg-secondary rounded-full text-secondary-foreground">
                                    <User className="h-6 w-6" />
                                </div>
                            )}
                        </div>
                    ))}
                        {isLoading && (
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-primary rounded-full text-primary-foreground">
                                <Bot className="h-6 w-6" />
                            </div>
                            <div className="rounded-lg p-4 bg-muted flex items-center space-x-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <p className="text-sm">{t('thinking')}</p>
                            </div>
                        </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter>
                    <form onSubmit={handleSendMessage} className="flex w-full gap-2">
                    <Input 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={t('aiFitnessCoachPlaceholder')}
                        disabled={isLoading}
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
}


export default function FitnessAssistantPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <FitnessAssistantChat />
        </Suspense>
    )
}

    