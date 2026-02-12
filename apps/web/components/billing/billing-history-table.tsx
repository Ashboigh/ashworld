"use client";

import { FileText, Download, ExternalLink } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { Badge } from "@/components/ui/badge";
import type { SerializedBillingHistoryItem } from "@/types/billing";
import { formatPrice } from "@/lib/billing/plans";

interface BillingHistoryTableProps {
  history: SerializedBillingHistoryItem[];
}

const statusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export function BillingHistoryTable({ history }: BillingHistoryTableProps) {
  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Your invoices and payment history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No billing history yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing History</CardTitle>
        <CardDescription>Your invoices and payment history</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((item) => {
            const periodStart = new Date(item.periodStart).toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric" }
            );
            const periodEnd = new Date(item.periodEnd).toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric", year: "numeric" }
            );

            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {item.description || "Subscription"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {periodStart} - {periodEnd}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={statusColors[item.status] || statusColors.pending}>
                    {item.status}
                  </Badge>
                  <span className="font-medium min-w-[80px] text-right">
                    {formatPrice(item.amount)} {item.currency.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1">
                    {item.invoiceUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                      >
                        <a
                          href={item.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View invoice"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    {item.invoicePdf && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                      >
                        <a href={item.invoicePdf} download title="Download PDF">
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
