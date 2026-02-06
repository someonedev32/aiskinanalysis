import { useEffect, useState } from "react";
import axios from "axios";
import { MetricCard } from "@/components/MetricCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Scan,
  Users,
  TrendingUp,
  Activity,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useNavigate } from "react-router-dom";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Seed demo data first, then fetch overview
        await axios.get(`${API}/dashboard/demo-data`);
        const res = await axios.get(`${API}/dashboard/overview`, {
          params: { shop_domain: "demo-store.myshopify.com" },
        });
        setData(res.data);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in" data-testid="dashboard-loading">
        <div className="h-8 w-48 bg-[#F2F0EB] rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-xl border border-[#E4E4E7] animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-white rounded-xl border border-[#E4E4E7] animate-pulse" />
      </div>
    );
  }

  const shop = data?.shop;
  const scanUsage = shop ? Math.round((shop.scan_count / (shop.scan_limit || 1)) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in" data-testid="dashboard-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A1A1A]">
          Dashboard
        </h1>
        <p className="text-sm text-[#A1A1AA] mt-1">
          Overview of your AI Skin Analysis performance
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Scans"
          value={data?.total_scans?.toLocaleString() || "0"}
          subtitle="all time"
          icon={Scan}
          trend={12}
          className="stagger-1 animate-fade-in"
        />
        <MetricCard
          title="Today's Scans"
          value={data?.scans_today?.toLocaleString() || "0"}
          subtitle="since midnight"
          icon={Activity}
          trend={8}
          className="stagger-2 animate-fade-in"
        />
        <MetricCard
          title="Active Shops"
          value={data?.active_shops || "0"}
          subtitle={`of ${data?.total_shops || 0} total`}
          icon={Users}
          className="stagger-3 animate-fade-in"
        />
        <MetricCard
          title="Plan"
          value={shop?.plan ? shop.plan.charAt(0).toUpperCase() + shop.plan.slice(1) : "None"}
          subtitle={shop?.billing_status || "no plan"}
          icon={CreditCard}
          className="stagger-4 animate-fade-in"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scan Trend Chart */}
        <Card className="col-span-2 p-6 border-[#E4E4E7]" data-testid="scan-trend-chart">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-[#1A1A1A]">Scan Activity</h3>
              <p className="text-xs text-[#A1A1AA] mt-0.5">Last 7 days</p>
            </div>
            <TrendingUp className="w-4 h-4 text-[#4A6C58]" strokeWidth={1.5} />
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.chart_data || []}>
                <defs>
                  <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4A6C58" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#4A6C58" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #E4E4E7",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#4A6C58"
                  strokeWidth={2}
                  fill="url(#scanGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Quota Card */}
        <Card className="p-6 border-[#E4E4E7] flex flex-col justify-between" data-testid="quota-card">
          <div>
            <h3 className="text-sm font-semibold text-[#1A1A1A]">Scan Quota</h3>
            <p className="text-xs text-[#A1A1AA] mt-0.5">Monthly usage</p>
          </div>

          <div className="mt-6">
            <div className="flex items-end gap-1">
              <span className="text-3xl font-semibold text-[#1A1A1A] font-[Manrope]">
                {shop?.scan_count || 0}
              </span>
              <span className="text-sm text-[#A1A1AA] mb-1">
                / {shop?.scan_limit || 0}
              </span>
            </div>
            <Progress
              value={scanUsage}
              className="mt-3 h-2 bg-[#F2F0EB]"
            />
            <p className="text-xs text-[#A1A1AA] mt-2">{scanUsage}% used</p>
          </div>

          <Button
            onClick={() => navigate("/billing")}
            className="mt-4 bg-[#4A6C58] hover:bg-[#3D5A49] text-white w-full"
            data-testid="upgrade-btn"
          >
            Upgrade Plan
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" strokeWidth={1.5} />
          </Button>
        </Card>
      </div>

      {/* Skin Type Distribution */}
      {data?.skin_type_distribution && data.skin_type_distribution.length > 0 && (
        <Card className="p-6 border-[#E4E4E7]" data-testid="skin-type-distribution">
          <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4">
            Skin Type Distribution
          </h3>
          <div className="flex flex-wrap gap-3">
            {data.skin_type_distribution.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-2 bg-[#F9FAFB] border border-[#E4E4E7] rounded-lg px-3.5 py-2"
              >
                <Badge variant="secondary" className="bg-[#F2F0EB] text-[#4A6C58] text-xs font-medium">
                  {item.value}
                </Badge>
                <span className="text-sm text-[#52525B]">{item.name}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
