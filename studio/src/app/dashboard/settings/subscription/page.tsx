

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, Bot, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/use-translation";


export default function SubscriptionPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const handleActionClick = (actionName: string) => {
    // Placeholder function
  };

  return (
    <div className="space-y-6">
       <Link href="/dashboard/settings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">{t('backToSettings')}</span>
          </Button>
          <span>{t('backToSettings')}</span>
      </Link>
       <Card>
        <CardHeader>
          <CardTitle>{t('manageSubscriptionTitle')}</CardTitle>
          <CardDescription>{t('manageSubscriptionDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between md:items-center p-4 rounded-lg bg-primary/10">
              <div>
                  <p className="font-semibold">{t('currentPlanLabel')} <span className="text-primary">Athlete</span></p>
                  <p className="text-xs text-muted-foreground">{t('planRenewsOn', { date: 'December 31, 2024' })}</p>
              </div>
              <Button type="button" variant="default" className="mt-2 md:mt-0" disabled>
                  {t('upgradePlanComingSoon')}
              </Button>
          </div>
          <div className="space-y-4">
              <div className="flex items-center justify-between">
                  <p className="font-medium">{t('paymentMethod')}</p>
                  <Button type="button" variant="outline" onClick={() => handleActionClick("Update Payment")} disabled>
                      {t('updatePayment')}
                  </Button>
              </div>
              <div className="flex items-center justify-between">
                  <p className="font-medium">{t('invoiceHistory')}</p>
                  <Button type="button" variant="outline" onClick={() => handleActionClick("View History")} disabled>
                      {t('viewHistory')}
                  </Button>
              </div>
          </div>
          <div className="border-2 border-dashed border-destructive/50 rounded-lg p-4 text-center">
              <h4 className="font-semibold text-destructive">{t('cancelSubscriptionTitle')}</h4>
              <p className="text-sm text-muted-foreground mt-1 mb-3">{t('cancelSubscriptionDescription')}</p>
              <Button variant="destructive" disabled>{t('cancelSubscriptionTitle')}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    
