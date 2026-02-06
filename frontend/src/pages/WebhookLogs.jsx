import { useEffect, useState } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshCw, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TOPIC_LABELS = {
  "customers/redact": { label: "Customer Redact", color: "bg-amber-100 text-amber-800" },
  "shop/redact": { label: "Shop Redact", color: "bg-red-100 text-red-800" },
  "customers/data_request": { label: "Data Request", color: "bg-blue-100 text-blue-800" },
  "customers/data-request": { label: "Data Request", color: "bg-blue-100 text-blue-800" },
  "app/uninstalled": { label: "App Uninstalled", color: "bg-slate-100 text-slate-800" },
  "subscription/update": { label: "Billing Update", color: "bg-[#F2F0EB] text-[#4A6C58]" },
};

export default function WebhookLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/webhooks/logs`);
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error("Webhook logs fetch error:", err);
      toast.error("Failed to fetch webhook logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in" data-testid="webhooks-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A1A1A]">Webhooks</h1>
          <p className="text-sm text-[#A1A1AA] mt-1">
            HMAC-verified webhook event logs
          </p>
        </div>
        <Button
          onClick={fetchLogs}
          variant="outline"
          className="border-[#E4E4E7] text-[#52525B]"
          data-testid="refresh-webhooks-btn"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`}
            strokeWidth={1.5}
          />
          Refresh
        </Button>
      </div>

      {/* Webhook Endpoints Info */}
      <Card className="p-5 border-[#E4E4E7] bg-[#F9FAFB]" data-testid="webhook-endpoints-info">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-[#4A6C58] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <h3 className="text-sm font-semibold text-[#1A1A1A]">
              HMAC Verification Active
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
              All incoming webhooks are verified using HMAC-SHA256 with your Shopify API
              secret. Only verified requests are processed and logged.
            </p>
            <div className="mt-3 space-y-1">
              {[
                { endpoint: "/api/webhooks/customers/redact", label: "GDPR Customer Redact" },
                { endpoint: "/api/webhooks/shop/redact", label: "GDPR Shop Redact" },
                { endpoint: "/api/webhooks/customers/data-request", label: "GDPR Data Request" },
                { endpoint: "/api/webhooks/app/uninstalled", label: "App Uninstalled" },
                { endpoint: "/api/webhooks/subscription/update", label: "Billing Update" },
              ].map((ep) => (
                <div key={ep.endpoint} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3 h-3 text-[#3F6212]" strokeWidth={2} />
                  <code className="text-[#52525B] font-mono">{ep.endpoint}</code>
                  <span className="text-[#A1A1AA]">{ep.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="border-[#E4E4E7]" data-testid="webhook-logs-table">
        <div className="p-5 border-b border-[#E4E4E7]">
          <h3 className="text-sm font-semibold text-[#1A1A1A]">
            Recent Events ({logs.length})
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Timestamp</TableHead>
              <TableHead className="text-xs">Topic</TableHead>
              <TableHead className="text-xs">Shop</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log, i) => {
              const topicInfo = TOPIC_LABELS[log.topic] || {
                label: log.topic,
                color: "bg-gray-100 text-gray-800",
              };
              return (
                <TableRow key={i} data-testid={`webhook-log-${i}`}>
                  <TableCell className="text-xs text-[#52525B]">
                    {new Date(log.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] border-0 ${topicInfo.color}`}
                    >
                      {topicInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[#A1A1AA] font-mono">
                    {log.shop_domain}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {log.status === "processed" ? (
                        <CheckCircle2 className="w-3 h-3 text-[#3F6212]" strokeWidth={2} />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-[#854D0E]" strokeWidth={2} />
                      )}
                      <span className="text-xs text-[#52525B]">{log.status}</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-[#A1A1AA] py-8">
                  No webhook events recorded yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
