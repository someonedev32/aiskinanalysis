export function MetricCard({ title, value, subtitle, icon: Icon, trend, className = "" }) {
  return (
    <div
      className={`metric-card bg-white border border-[#E4E4E7] p-3 sm:p-5 rounded-xl flex flex-col justify-between min-h-[100px] sm:min-h-[120px] ${className}`}
      data-testid={`metric-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs font-medium text-[#A1A1AA] uppercase tracking-wide truncate">{title}</p>
          <p className="text-lg sm:text-2xl font-semibold text-[#1A1A1A] mt-1 font-[Manrope]">{value}</p>
        </div>
        {Icon && (
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-[#F2F0EB] flex items-center justify-center flex-shrink-0 ml-2">
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#4A6C58]" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="mt-2 sm:mt-3 flex items-center gap-1.5 sm:gap-2 flex-wrap">
        {trend !== undefined && (
          <span
            className={`text-[10px] sm:text-xs font-medium ${
              trend >= 0 ? "text-[#3F6212]" : "text-[#991B1B]"
            }`}
          >
            {trend >= 0 ? "+" : ""}
            {trend}%
          </span>
        )}
        {subtitle && <span className="text-[10px] sm:text-xs text-[#A1A1AA]">{subtitle}</span>}
      </div>
    </div>
  );
}
