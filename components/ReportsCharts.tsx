"use client";
import { useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { formatMoney } from "@/lib/utils";

type Tx = {
  id: string;
  amount: number;
  currency: string;
  kind: string;
  occurred_at: string;
  category: { name: string; color: string } | null;
};

export function ReportsCharts({ transactions }: { transactions: Tx[] }) {
  const currencies = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.currency))).sort(),
    [transactions]
  );
  const [currency, setCurrency] = useState(currencies[0] || "THB");

  const filtered = useMemo(
    () => transactions.filter((t) => t.currency === currency),
    [transactions, currency]
  );

  // Pie data: expenses by category
  const pieData = useMemo(() => {
    const byCat: Record<string, { name: string; value: number; color: string }> = {};
    for (const t of filtered) {
      if (t.kind !== "expense") continue;
      const key = t.category?.name || "Uncategorized";
      const col = t.category?.color || "#94a3b8";
      byCat[key] ||= { name: key, value: 0, color: col };
      byCat[key].value += Number(t.amount);
    }
    return Object.values(byCat).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Bar data: monthly income vs expense (last 6 months)
  const barData = useMemo(() => {
    const months: Record<string, { month: string; income: number; expense: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[k] = { month: d.toLocaleDateString("en", { month: "short" }), income: 0, expense: 0 };
    }
    for (const t of filtered) {
      const d = new Date(t.occurred_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!months[k]) continue;
      if (t.kind === "income") months[k].income += Number(t.amount);
      else months[k].expense += Number(t.amount);
    }
    return Object.values(months);
  }, [filtered]);

  const totalExpense = pieData.reduce((s, x) => s + x.value, 0);

  if (transactions.length === 0) {
    return (
      <div className="card p-10 text-center text-slate-500">
        Transaction မရှိသေးပါ — အရင် add လုပ်ပါ။
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Currency switcher */}
      <div className="flex gap-2">
        {currencies.map((c) => (
          <button
            key={c}
            onClick={() => setCurrency(c)}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              currency === c ? "bg-brand-600 text-white border-brand-600" : "bg-white border-slate-300 text-slate-700"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Pie chart */}
        <div className="card p-5">
          <h3 className="font-semibold mb-1">Spending by Category</h3>
          <p className="text-xs text-slate-500 mb-4">Total: {formatMoney(totalExpense, currency)}</p>
          {pieData.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No expense in {currency}</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={90}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatMoney(Number(v), currency)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <ul className="space-y-1.5 mt-3 max-h-40 overflow-auto">
            {pieData.map((d) => (
              <li key={d.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="font-medium">{formatMoney(d.value, currency)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bar chart */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Last 6 Months — Income vs Expense</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v: any) => formatMoney(Number(v), currency)} />
                <Legend />
                <Bar dataKey="income" fill="#22c55e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
