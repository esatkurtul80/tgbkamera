import {
  Eye, DollarSign, Percent, Users,
  ArrowUpRight, ArrowDownRight,
  Calendar, ListFilter, Download,
  SlidersHorizontal, ArrowUpDown, MoreHorizontal,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number) {
  const os = polarToCartesian(cx, cy, outerR, startDeg);
  const oe = polarToCartesian(cx, cy, outerR, endDeg);
  const is_ = polarToCartesian(cx, cy, innerR, startDeg);
  const ie = polarToCartesian(cx, cy, innerR, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const f = (n: number) => n.toFixed(2);
  return [
    `M ${f(os.x)} ${f(os.y)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${f(oe.x)} ${f(oe.y)}`,
    `L ${f(ie.x)} ${f(ie.y)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${f(is_.x)} ${f(is_.y)}`,
    "Z",
  ].join(" ");
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  title,
  value,
  change,
  up,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  change: string;
  up: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-500">
          <Icon size={15} />
          <span className="text-sm">{title}</span>
        </div>
        <button className="text-slate-300 hover:text-slate-500">
          <MoreHorizontal size={16} />
        </button>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold text-slate-900 tracking-tight">{value}</span>
        <span
          className={`flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full mb-1 ${
            up ? "text-emerald-600 bg-emerald-50" : "text-red-500 bg-red-50"
          }`}
        >
          {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {change}
        </span>
      </div>
    </div>
  );
}

// ─── Sales Overview Chart ────────────────────────────────────────────────────

function SalesOverviewChart() {
  const chartBottom = 168;
  const colors = [
    { bar: "#1E1B4B", ribbon: "rgba(30,27,75,0.15)" },
    { bar: "#3B82F6", ribbon: "rgba(59,130,246,0.15)" },
    { bar: "#06B6D4", ribbon: "rgba(6,182,212,0.25)" },
    { bar: "#8B5CF6", ribbon: "rgba(139,92,246,0.15)" },
    { bar: "#A5B4FC", ribbon: "rgba(165,180,252,0.15)" },
  ];
  const ratios = [0.30, 0.25, 0.22, 0.13, 0.10];

  const groups = [
    { label: "Oct", value: "$2,988.20", totalPx: 100, x1: 48, x2: 103 },
    { label: "Nov", value: "$1,765.09", totalPx: 59, x1: 180, x2: 235 },
    { label: "Dec", value: "$4,005.65", totalPx: 140, x1: 312, x2: 367 },
  ];

  function getStacks(totalPx: number) {
    let cur = chartBottom;
    return ratios.map((r) => {
      const h = Math.round(r * totalPx);
      const pos = { top: cur - h, bottom: cur };
      cur -= h;
      return pos;
    });
  }

  const stacks = groups.map((g) => getStacks(g.totalPx));

  function ribbon(
    x1: number, x2: number,
    s1: { top: number; bottom: number },
    s2: { top: number; bottom: number },
  ) {
    const mx = (x1 + x2) / 2;
    return `M ${x1} ${s1.top} C ${mx} ${s1.top} ${mx} ${s2.top} ${x2} ${s2.top} L ${x2} ${s2.bottom} C ${mx} ${s2.bottom} ${mx} ${s1.bottom} ${x1} ${s1.bottom} Z`;
  }

  return (
    <svg viewBox="0 0 415 185" className="w-full">
      {/* Ribbons */}
      {[0, 1].map((gi) =>
        colors.map((c, ci) => (
          <path
            key={`r-${gi}-${ci}`}
            d={ribbon(groups[gi].x2, groups[gi + 1].x1, stacks[gi][ci], stacks[gi + 1][ci])}
            fill={c.ribbon}
          />
        )),
      )}
      {/* Bars */}
      {groups.map((g, gi) =>
        colors.map((c, ci) => (
          <rect
            key={`b-${gi}-${ci}`}
            x={g.x1} y={stacks[gi][ci].top}
            width={g.x2 - g.x1} height={stacks[gi][ci].bottom - stacks[gi][ci].top}
            fill={c.bar} rx="2"
          />
        )),
      )}
      {/* Value labels */}
      {groups.map((g, gi) => (
        <text
          key={`v-${gi}`}
          x={(g.x1 + g.x2) / 2} y={stacks[gi][stacks[gi].length - 1].top - 7}
          textAnchor="middle" fontSize="10" fontWeight="600" fill="#374151"
        >
          {g.value}
        </text>
      ))}
      {/* Month labels */}
      {groups.map((g, gi) => (
        <text
          key={`m-${gi}`}
          x={(g.x1 + g.x2) / 2} y={180}
          textAnchor="middle" fontSize="11" fill="#9CA3AF"
        >
          {g.label}
        </text>
      ))}
    </svg>
  );
}

// ─── Subscriber Chart ────────────────────────────────────────────────────────

function SubscriberChart() {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const rawValues = [1100, 1750, 3874, 870, 1480, 750, 1050];
  const maxV = 3874;
  const chartH = 105;
  const chartBot = 120;
  const bw = 18;
  const step = 28;
  const startX = 12;

  return (
    <svg viewBox="0 0 215 145" className="w-full">
      <defs>
        <linearGradient id="purpleG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#C4B5FD" />
        </linearGradient>
      </defs>
      {days.map((day, i) => {
        const h = Math.round((rawValues[i] / maxV) * chartH);
        const x = startX + i * step;
        const y = chartBot - h;
        const isTue = i === 2;
        return (
          <g key={day}>
            <rect x={x} y={y} width={bw} height={h} fill={isTue ? "url(#purpleG)" : "#E5E7EB"} rx="4" />
            {isTue && (
              <text x={x + bw / 2} y={y - 5} textAnchor="middle" fontSize="9" fontWeight="700" fill="#374151">
                3,874
              </text>
            )}
            <text x={x + bw / 2} y={137} textAnchor="middle" fontSize="9" fill={isTue ? "#7C3AED" : "#9CA3AF"} fontWeight={isTue ? "700" : "400"}>
              {day}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────

function DonutChart() {
  const cx = 65, cy = 65, outerR = 56, innerR = 34;
  const segments = [
    { label: "Website", value: 374.82, color: "#3B82F6" },
    { label: "Mobile App", value: 241.60, color: "#06B6D4" },
    { label: "Other", value: 213.42, color: "#E2E8F0" },
  ];
  const total = segments.reduce((s, x) => s + x.value, 0);

  let angle = -90;
  const paths = segments.map((seg) => {
    const span = (seg.value / total) * 360;
    const path = arcPath(cx, cy, outerR, innerR, angle, angle + span);
    angle += span;
    return { ...seg, path };
  });

  return (
    <svg viewBox="0 0 130 130" className="w-full max-w-[130px]">
      {paths.map((p) => (
        <path key={p.label} d={p.path} fill={p.color} />
      ))}
    </svg>
  );
}

// ─── Progress Bar ────────────────────────────────────────────────────────────

function RateBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right">{value}%</span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const integrations = [
  { name: "Stripe", type: "Finance", rate: 40, profit: "$650.00", color: "#6366F1", initials: "S", bg: "#EEF2FF" },
  { name: "Zapier", type: "CRM", rate: 80, profit: "$720.50", color: "#3B82F6", initials: "Z", bg: "#EFF6FF" },
  { name: "Shopify", type: "Marketplace", rate: 20, profit: "$432.25", color: "#8B5CF6", initials: "Sh", bg: "#F5F3FF" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-5 max-w-[1280px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 bg-white rounded-lg px-3 py-2 hover:bg-slate-50">
            <Calendar size={13} /> Oct 18 - Nov 18
            <span className="text-slate-400 mx-0.5">|</span> Monthly
          </button>
          <button className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 bg-white rounded-lg px-3 py-2 hover:bg-slate-50">
            <ListFilter size={13} /> Filter
          </button>
          <button className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 bg-white rounded-lg px-3 py-2 hover:bg-slate-50">
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-5">
        <StatCard icon={Eye} title="Page Views" value="12,450" change="15.8%" up />
        <StatCard icon={DollarSign} title="Total Revenue" value="$363.95" change="34.0%" up={false} />
        <StatCard icon={Percent} title="Bounce Rate" value="86.5%" change="24.2%" up />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-12 gap-5">
        {/* Sales Overview */}
        <div className="col-span-7 bg-white rounded-2xl p-5 border border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-slate-700">
              <MoreHorizontal size={15} className="text-slate-400" />
              <span className="text-sm font-semibold">Sales Overview</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="flex items-center gap-1 text-xs text-slate-500 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50">
                <SlidersHorizontal size={11} /> Filter
              </button>
              <button className="flex items-center gap-1 text-xs text-slate-500 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50">
                <ArrowUpDown size={11} /> Sort
              </button>
              <button className="text-slate-400 hover:text-slate-600 p-1.5">
                <MoreHorizontal size={14} />
              </button>
            </div>
          </div>
          <div className="mb-3">
            <p className="text-2xl font-bold text-slate-900">$9,257.51</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full text-emerald-600 bg-emerald-50">
                <ArrowUpRight size={11} /> 15.8%
              </span>
              <span className="text-xs text-slate-500">+ $143.50 increased</span>
            </div>
          </div>
          <SalesOverviewChart />
          {/* Legend */}
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {[
              { label: "China", color: "#1E1B4B" },
              { label: "UE", color: "#3B82F6" },
              { label: "USA", color: "#06B6D4" },
              { label: "Canada", color: "#8B5CF6" },
              { label: "Other", color: "#A5B4FC" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                <span className="text-xs text-slate-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Total Subscriber */}
        <div className="col-span-5 bg-white rounded-2xl p-5 border border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-slate-700">
              <Users size={15} className="text-slate-400" />
              <span className="text-sm font-semibold">Total Subscriber</span>
            </div>
            <button className="flex items-center gap-1 text-xs text-slate-500 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50">
              Weekly ▾
            </button>
          </div>
          <p className="text-2xl font-bold text-slate-900 mb-1">24,473</p>
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full text-emerald-600 bg-emerald-50">
              <ArrowUpRight size={11} /> 8.3%
            </span>
            <span className="text-xs text-slate-500">+ 749 increased</span>
          </div>
          <SubscriberChart />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-12 gap-5">
        {/* Sales Distribution */}
        <div className="col-span-5 bg-white rounded-2xl p-5 border border-slate-100">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 text-slate-700">
              <MoreHorizontal size={15} className="text-slate-400" />
              <span className="text-sm font-semibold">Sales Distribution</span>
            </div>
            <button className="flex items-center gap-1 text-xs text-slate-500 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50">
              Monthly ▾
            </button>
          </div>
          <div className="flex items-center gap-6">
            <DonutChart />
            <div className="space-y-3 flex-1">
              {[
                { label: "Website", amount: "$374.82", color: "#3B82F6" },
                { label: "Mobile App", amount: "$241.60", color: "#06B6D4" },
                { label: "Other", amount: "$213.42", color: "#E2E8F0" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-500">{item.label}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 ml-4">{item.amount}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* List of Integration */}
        <div className="col-span-7 bg-white rounded-2xl p-5 border border-slate-100">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 text-slate-700">
              <MoreHorizontal size={15} className="text-slate-400" />
              <span className="text-sm font-semibold">List of Integration</span>
            </div>
            <button className="text-xs text-blue-600 font-semibold hover:underline">See All</button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="w-6 pb-2.5" />
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider pb-2.5">Application</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider pb-2.5">Type</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider pb-2.5 w-36">Rate</th>
                <th className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider pb-2.5">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {integrations.map((row) => (
                <tr key={row.name} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5">
                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300" />
                  </td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: row.bg, color: row.color }}
                      >
                        {row.initials}
                      </div>
                      <span className="text-sm font-medium text-slate-800">{row.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 text-sm text-slate-500">{row.type}</td>
                  <td className="py-3.5">
                    <RateBar value={row.rate} color={row.color} />
                  </td>
                  <td className="py-3.5 text-sm font-semibold text-slate-800 text-right">{row.profit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
