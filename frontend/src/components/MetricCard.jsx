export function MetricCard({ title, value, subtitle, icon: Icon, trend, className = "" }) {
  return (
    <div
      className={`metric-card bg-white border border-[#E4E4E7] p-5 rounded-xl flex flex-col justify-between ${className}`}
      data-testid={`metric-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-semibold text-[#1A1A1A] mt-1.5 font-[Manrope]">{value}</p>
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-[#F2F0EB] flex items-center justify-center">
            <Icon className="w-4 h-4 text-[#4A6C58]" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        {trend !== undefined && (
          <span
            className={`text-xs font-medium ${
              trend >= 0 ? "text-[#3F6212]" : "text-[#991B1B]"
            }`}
          >
            {trend >= 0 ? "+" : ""}
            {trend}%
          </span>
        )}
        {subtitle && <span className="text-xs text-[#A1A1AA]">{subtitle}</span>}
      </div>
    </div>
  );
}
