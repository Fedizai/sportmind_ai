

"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, BrainCircuit, Sparkles, Lightbulb, Shield, Eye } from 'lucide-react';
import { getMentalPrepAdvice } from '@/ai/flows/mental-coach-flow';
import type { MentalCoachOutput } from '@/ai/schemas';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence, motion } from 'framer-motion';

const mentalCoachSchema = z.object({
  scenario: z.string().min(10, { message: "Please describe your scenario in a bit more detail." }),
});

type MentalCoachForm = z.infer<typeof mentalCoachSchema>;

export default function MentalCoachPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [advice, setAdvice] = useState<MentalCoachOutput | null>(null);

  const form = useForm<MentalCoachForm>({
    resolver: zodResolver(mentalCoachSchema),
  });

  const onSubmit = async (data: MentalCoachForm) => {
    setIsLoading(true);
    setAdvice(null);
    try {
      const result = await getMentalPrepAdvice(data);
      setAdvice(result);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "AI Coach Error",
        description: "Could not get a response. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
          <BrainCircuit className="h-8 w-8 text-primary" />
          Mental Coach
        </h1>
        <p className="text-muted-foreground">
          Prepare your mind for any challenge with personalized AI-driven advice.
        </p>
      </div>

      <Card>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>What's on your mind?</CardTitle>
            <CardDescription>
              Describe your upcoming challenge or current mental state. For example, "I have a championship match tomorrow" or "I'm in a performance slump."
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input 
              {...form.register("scenario")} 
              placeholder="Describe your scenario..."
              disabled={isLoading}
            />
            {form.formState.errors.scenario && (
              <p className="text-sm text-destructive mt-2">{form.formState.errors.scenario.message}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {isLoading ? 'Getting Advice...' : 'Get Advice'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <AnimatePresence>
        {advice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <Lightbulb className="h-8 w-8 text-primary" />
                <div>
                    <CardTitle>Focus Point</CardTitle>
                    <CardDescription>Your main point of concentration.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{advice.focus}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                    <CardTitle>Confidence Booster</CardTitle>
                    <CardDescription>A key thought to build self-belief.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{advice.confidenceBooster}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <Eye className="h-8 w-8 text-primary" />
                <div>
                    <CardTitle>Visualization Exercise</CardTitle>
                    <CardDescription>Mentally rehearse your success.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{advice.visualization}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
