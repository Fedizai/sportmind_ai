
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Lock, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/use-translation";

interface UpgradeProModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeProModal({
  open,
  onOpenChange,
}: UpgradeProModalProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const handleUpgrade = () => {
    router.push("/#pricing");
  };

  const handleRefresh = () => {
    window.location.reload();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="p-4 bg-yellow-400/20 rounded-full">
                <Lock className="h-8 w-8 text-yellow-500" />
            </div>
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl font-bold">
                {t('proFeatureLockedTitle')}
              </DialogTitle>
              <DialogDescription>
                {t('proFeatureLockedDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="w-full space-y-2 text-left">
                <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="text-sm">{t('proFeature1')}</span>
                </div>
                 <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="text-sm">{t('proFeature2')}</span>
                </div>
                 <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="text-sm">{t('proFeature3')}</span>
                </div>
            </div>
            <div className="w-full pt-4 space-y-2">
                 <Button onClick={handleUpgrade} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">
                    {t('upgradeToPro')}
                </Button>
                <Button variant="link" size="sm" className="text-xs" onClick={handleRefresh}>
                    {t('alreadyUpgraded')}
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
