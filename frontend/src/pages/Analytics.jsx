import { useEffect, useState } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Calendar, Filter } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PIE_COLORS = ["#4A6C58", "#D4A373", "#7AA2F7", "#9ECE6A", "#BB9AF7"];

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState("25");

  const shopDomain = "demo-store.myshopify.com";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, scansRes] = await Promise.all([
          axios.get(`${API}/dashboard/overview`, {
            params: { shop_domain: shopDomain },
          }),
          axios.get(`${API}/dashboard/scans`, {
            params: { shop_domain: shopDomain, limit: parseInt(limit) },
          }),
        ]);
        setOverview(overviewRes.data);
        setScans(scansRes.data.scans || []);
      } catch (err) {
        console.error("Analytics fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [limit]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in" data-testid="analytics-loading">
        <div className="h-8 w-40 bg-[#F2F0EB] rounded-lg animate-pulse" />
        <div className="h-64 bg-white rounded-xl border border-[#E4E4E7] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in" data-testid="analytics-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A1A1A]">Analytics</h1>
        <p className="text-sm text-[#A1A1AA] mt-1">
          Scan history and usage analytics
        </p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Daily Scans Bar Chart */}
        <Card className="p-4 sm:p-6 border-[#E4E4E7]" data-testid="daily-scans-chart">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-[#1A1A1A]">Daily Scans</h3>
            <Calendar className="w-4 h-4 text-[#A1A1AA]" strokeWidth={1.5} />
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview?.chart_data || []}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#A1A1AA" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(d) => d.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#A1A1AA" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #E4E4E7",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" fill="#4A6C58" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Skin Type Pie Chart */}
        <Card className="p-6 border-[#E4E4E7]" data-testid="skin-type-chart">
          <h3 className="text-sm font-semibold text-[#1A1A1A] mb-5">
            Skin Type Breakdown
          </h3>
          <div className="h-56 flex items-center">
            <div className="w-1/2">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={overview?.skin_type_distribution || []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {(overview?.skin_type_distribution || []).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #E4E4E7",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-2">
              {(overview?.skin_type_distribution || []).map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-xs text-[#52525B]">{item.name}</span>
                  <span className="text-xs text-[#A1A1AA] ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Scan History Table */}
      <Card className="border-[#E4E4E7]" data-testid="scan-history-table">
        <div className="p-5 flex items-center justify-between border-b border-[#E4E4E7]">
          <h3 className="text-sm font-semibold text-[#1A1A1A]">Scan History</h3>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#A1A1AA]" strokeWidth={1.5} />
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger className="w-24 h-8 text-xs" data-testid="scan-limit-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 rows</SelectItem>
                <SelectItem value="25">25 rows</SelectItem>
                <SelectItem value="50">50 rows</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Skin Type</TableHead>
              <TableHead className="text-xs">Score</TableHead>
              <TableHead className="text-xs">Concerns</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scans.map((scan, i) => (
              <TableRow key={i} data-testid={`scan-row-${i}`}>
                <TableCell className="text-xs text-[#52525B]">
                  {new Date(scan.timestamp).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className="bg-[#F2F0EB] text-[#4A6C58] text-xs"
                  >
                    {scan.skin_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span
                    className={`text-xs font-medium ${
                      scan.score >= 70
                        ? "text-[#3F6212]"
                        : scan.score >= 40
                        ? "text-[#854D0E]"
                        : "text-[#991B1B]"
                    }`}
                  >
                    {scan.score}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-[#A1A1AA]">
                  {(scan.concerns || []).join(", ")}
                </TableCell>
              </TableRow>
            ))}
            {scans.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-[#A1A1AA] py-8">
                  No scans recorded yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
