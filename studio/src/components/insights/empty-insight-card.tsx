
"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PlusCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export const EmptyInsightCard = ({ title, description, link, icon: Icon, className, isRectangle }: { title: string, description: string, link: string, icon: React.ComponentType<{ className?: string }>, className?: string, isRectangle?: boolean }) => {
    const router = useRouter();
    return (
        <motion.div variants={itemVariants} whileHover="hover" className={className} onClick={() => router.push(link)}>
            <Card className={cn("h-full group cursor-pointer flex flex-col", !isRectangle && "aspect-square")}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Icon className="text-primary h-5 w-5" /> {title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4 border-2 border-dashed border-muted rounded-lg group-hover:border-primary/50 transition-colors">
                        <PlusCircle className="h-8 w-8 mb-2 text-muted-foreground/50" />
                        <p className="text-sm font-semibold">{description}</p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};
