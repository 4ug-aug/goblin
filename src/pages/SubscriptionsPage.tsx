import { AccountSelector } from "@/components/transactions/AccountSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
    detectSubscriptions,
    dismissSubscription,
    getAccounts,
    getSubscriptions,
    saveSubscription,
    type Account,
    type Subscription,
} from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { CalendarCheck, Repeat, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const frequencyLabels: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export function SubscriptionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [detected, setDetected] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  // Load accounts
  useEffect(() => {
    async function load() {
      try {
        const data = await getAccounts();
        setAccounts(data);
        if (data.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data[0].id);
        }
      } catch (error) {
        console.error("Failed to load accounts:", error);
      }
    }
    load();
  }, []);

  // Load saved subscriptions
  const loadSubscriptions = useCallback(async () => {
    if (!selectedAccountId) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getSubscriptions(selectedAccountId);
      setSubscriptions(data);
    } catch (error) {
      console.error("Failed to load subscriptions:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  // Detect subscriptions
  const handleDetect = async () => {
    if (!selectedAccountId) return;
    setDetecting(true);
    try {
      const result = await detectSubscriptions(selectedAccountId);
      setDetected(result);
      if (result.length === 0) {
        toast.info("No recurring payments detected");
      } else {
        toast.success(`Found ${result.length} potential subscriptions`);
      }
    } catch (error) {
      console.error("Failed to detect subscriptions:", error);
      toast.error("Detection failed");
    } finally {
      setDetecting(false);
    }
  };

  // Save a detected subscription
  const handleSave = async (sub: Subscription) => {
    try {
      await saveSubscription(sub);
      toast.success("Subscription saved");
      setDetected(detected.filter((d) => d.payee_pattern !== sub.payee_pattern));
      loadSubscriptions();
    } catch (error) {
      console.error("Failed to save subscription:", error);
      toast.error("Could not save subscription");
    }
  };

  // Dismiss (ignore) a detected subscription
  const handleIgnore = (sub: Subscription) => {
    setDetected(detected.filter((d) => d.payee_pattern !== sub.payee_pattern));
  };

  // Dismiss a saved subscription
  const handleDismiss = async (id: number) => {
    try {
      await dismissSubscription(id);
      toast.success("Subscription dismissed");
      loadSubscriptions();
    } catch (error) {
      console.error("Failed to dismiss subscription:", error);
      toast.error("Could not dismiss subscription");
    }
  };

  const formatNextDate = (date: string | null) => {
    if (!date) return "Unknown";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Subscriptions</h2>
          <p className="text-sm text-muted-foreground">
            Recurring payments detected from your transactions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AccountSelector
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onSelect={setSelectedAccountId}
          />
          <Button onClick={handleDetect} disabled={detecting || !selectedAccountId} variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" />
            {detecting ? "Detecting..." : "Detect"}
          </Button>
        </div>
      </div>

      {/* Detected Subscriptions - Pending Confirmation */}
      {detected.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-medium">Detected Subscriptions</h3>
            <Badge variant="secondary">{detected.length} found</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {detected.map((sub, i) => (
              <Card key={i} className="border-dashed border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{sub.payee_pattern}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Repeat className="h-3.5 w-3.5" />
                    {frequencyLabels[sub.frequency] || sub.frequency}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="text-2xl font-bold text-destructive">
                    {formatCurrency(sub.amount)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <CalendarCheck className="h-3 w-3" />
                    Next: {formatNextDate(sub.next_charge_date)}
                  </div>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {Math.round(sub.confidence * 100)}% confidence
                  </Badge>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleIgnore(sub)}>
                    Ignore
                  </Button>
                  <Button size="sm" onClick={() => handleSave(sub)}>
                    Save
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Saved Subscriptions */}
      {subscriptions.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">Your Subscriptions</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subscriptions.map((sub) => (
              <Card key={sub.id} className="group relative">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{sub.payee_pattern}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Repeat className="h-3.5 w-3.5" />
                    {frequencyLabels[sub.frequency] || sub.frequency}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {formatCurrency(sub.amount)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <CalendarCheck className="h-3 w-3" />
                    Next: {formatNextDate(sub.next_charge_date)}
                  </div>
                </CardContent>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => sub.id && handleDismiss(sub.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        !loading && detected.length === 0 && (
          <Card className="flex flex-col items-center justify-center p-12 bg-muted/50 border-dashed border-2">
            <Repeat className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No subscriptions yet</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-6">
              Click "Detect" to analyze your transactions and find recurring payments like Netflix, Spotify, or your gym membership.
            </p>
            <Button onClick={handleDetect} disabled={detecting || !selectedAccountId} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Detect Subscriptions
            </Button>
          </Card>
        )
      )}
    </div>
  );
}
