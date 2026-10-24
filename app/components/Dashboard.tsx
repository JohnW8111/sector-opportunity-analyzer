"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import type { DataQualityResult, SectorScore } from "@/lib/types";
import { DEFAULT_WEIGHTS } from "@/lib/config";

function barColor(score: number): string {
  if (score >= 65) return "#22c55e";
  if (score >= 55) return "#84cc16";
  if (score >= 45) return "#eab308";
  if (score >= 35) return "#f97316";
  return "#ef4444";
}

function heatColor(score: number): string {
  if (score >= 70) return "#16a34a";
  if (score >= 60) return "#22c55e";
  if (score >= 50) return "#84cc16";
  if (score >= 40) return "#eab308";
  if (score >= 30) return "#f97316";
  return "#ef4444";
}

function heatText(score: number): string {
  if (score >= 50) return "#fff";
  if (score >= 40) return "#1a1a1a";
  return "#fff";
}

interface DashboardProps {
  initialScores: SectorScore[];
  employmentQuality: DataQualityResult;
}

export default function Dashboard({ initialScores, employmentQuality }: DashboardProps) {
  const [weights, setWeights] = useState({ ...DEFAULT_WEIGHTS });
  const [view, setView] = useState<"chart" | "table">("chart");
  const [compareSelections, setCompareSelections] = useState<string[]>([]);

  // Recalculate scores client-side when weights change
  const scores = useMemo(() => {
    // Normalize weights
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    const norm: Record<string, number> = {};
    for (const [k, v] of Object.entries(weights)) {
      norm[k] = sum > 0 ? v / sum : 0.2;
    }

    // Recompute opportunity scores with new weights
    const reweighted = initialScores.map((s) => ({
      ...s,
      opportunityScore:
        Math.round(
          ((norm.momentum ?? 0.25) * s.momentumScore +
            (norm.valuation ?? 0.2) * s.valuationScore +
            (norm.growth ?? 0.2) * s.growthScore +
            (norm.innovation ?? 0.2) * s.innovationScore +
            (norm.macro ?? 0.15) * s.macroScore) *
            100
        ) / 100,
    }));

    // Re-sort and re-rank
    reweighted.sort((a, b) => b.opportunityScore - a.opportunityScore);
    reweighted.forEach((s, i) => (s.rank = i + 1));
    return reweighted;
  }, [initialScores, weights]);

  const totalWeight = Math.round(
    Object.values(weights).reduce((a, b) => a + b, 0) * 100
  );

  const top3 = scores.slice(0, 3);
  const avg =
    scores.reduce((a, s) => a + s.opportunityScore, 0) / scores.length;
  const max = Math.max(...scores.map((s) => s.opportunityScore));
  const min = Math.min(...scores.map((s) => s.opportunityScore));

  // Drivers for top sector
  const topDrivers: string[] = [];
  if (scores[0]?.momentumScore >= 70) topDrivers.push("momentum");
  if (scores[0]?.valuationScore >= 70) topDrivers.push("valuation");
  if (scores[0]?.growthScore >= 70) topDrivers.push("employment growth");
  if (scores[0]?.innovationScore >= 70) topDrivers.push("R&D investment");
  if (scores[0]?.macroScore >= 70) topDrivers.push("macro positioning");

  // Bar chart data
  const barData = [...scores].map((s) => ({
    name: s.sector
      .replace("Information Technology", "Info Tech")
      .replace("Consumer Discretionary", "Consumer Disc.")
      .replace("Consumer Staples", "Consumer Stapl.")
      .replace("Communication Services", "Comm. Services"),
    score: s.opportunityScore,
    fullName: s.sector,
  }));

  // Radar data for compare
  const radarSectors =
    compareSelections.length > 0
      ? scores.filter((s) => compareSelections.includes(s.sector))
      : scores.slice(0, 3);

  const radarData = [
    { axis: "Momentum", ...Object.fromEntries(radarSectors.map((s) => [s.sector, s.momentumScore])) },
    { axis: "Valuation", ...Object.fromEntries(radarSectors.map((s) => [s.sector, s.valuationScore])) },
    { axis: "Growth", ...Object.fromEntries(radarSectors.map((s) => [s.sector, s.growthScore])) },
    { axis: "Innovation", ...Object.fromEntries(radarSectors.map((s) => [s.sector, s.innovationScore])) },
    { axis: "Macro", ...Object.fromEntries(radarSectors.map((s) => [s.sector, s.macroScore])) },
  ];

  const radarColors = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444"];

  return (
    <div style={{ background: "#fff", minHeight: "100vh", color: "#1a1a1a" }}>
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid #e5e7eb",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>
          Sector Opportunity Analyzer
        </h1>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#fff",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "6px 14px",
              fontSize: "13px",
              color: "#2563eb",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Refresh Data
          </button>
        </div>
      </div>

      <div
        role={employmentQuality.status === "pass" ? "status" : "alert"}
        style={{
          padding: "10px 24px",
          fontSize: "13px",
          background: employmentQuality.status === "pass" ? "#f3f4f6" : "#fef3c7",
          color: employmentQuality.status === "pass" ? "#4b5563" : "#92400e",
        }}
      >
        Employment data: {employmentQuality.message}{" "}
        <a href="/api/data/quality" style={{ textDecoration: "underline" }}>Data source details</a>
      </div>

      <div style={{ display: "flex", maxWidth: "1600px", margin: "0 auto" }}>
        {/* Left Sidebar — Score Weights */}
        <aside
          style={{
            width: "280px",
            flexShrink: 0,
            borderRight: "1px solid #e5e7eb",
            padding: "20px",
          }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px" }}>
            Score Weights
          </h2>
          <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "16px" }}>
            Adjust the importance of each factor. Weights are automatically
            normalized.
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: "14px" }}>Total Weight</span>
            <span
              style={{
                background: totalWeight === 100 ? "#22c55e" : "#eab308",
                color: "#fff",
                padding: "2px 10px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {totalWeight}%
            </span>
          </div>

          {(
            [
              ["momentum", "Momentum", "#3b82f6"],
              ["valuation", "Valuation", "#22c55e"],
              ["growth", "Growth", "#f97316"],
              ["innovation", "Innovation", "#a855f7"],
              ["macro", "Macro", "#06b6d4"],
            ] as const
          ).map(([key, label, color]) => (
            <div key={key} style={{ marginBottom: "14px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13px",
                  marginBottom: "4px",
                }}
              >
                <span style={{ fontWeight: 500 }}>{label}</span>
                <span style={{ color: "#6b7280" }}>
                  {Math.round(weights[key] * 100)}%{" "}
                  {Math.round(weights[key] * 100) !==
                  Math.round(DEFAULT_WEIGHTS[key] * 100)
                    ? `\u2192 ${Math.round(DEFAULT_WEIGHTS[key] * 100)}%`
                    : ""}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(weights[key] * 100)}
                onChange={(e) =>
                  setWeights((w) => ({
                    ...w,
                    [key]: parseInt(e.target.value) / 100,
                  }))
                }
                style={{
                  width: "100%",
                  accentColor: color,
                  height: "6px",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "#9ca3af",
                }}
              >
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>
          ))}

          <button
            onClick={() => setWeights({ ...DEFAULT_WEIGHTS })}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              background: "#fff",
              color: "#2563eb",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              marginTop: "8px",
            }}
          >
            Reset to Defaults
          </button>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: "24px", overflow: "auto" }}>
          {/* Top Opportunities */}
          <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px" }}>
            Top Opportunities
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
            {top3.map((s) => (
              <div
                key={s.sector}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  padding: "20px",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "12px",
                  }}
                >
                  <span
                    style={{
                      background:
                        s.rank === 1
                          ? "#eab308"
                          : s.rank === 2
                            ? "#9ca3af"
                            : "#b45309",
                      color: "#fff",
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      fontWeight: 700,
                    }}
                  >
                    #{s.rank}
                  </span>
                  <span
                    style={{
                      background: "#f3f4f6",
                      borderRadius: "50%",
                      width: "40px",
                      height: "40px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      fontWeight: 700,
                      color: barColor(s.opportunityScore),
                    }}
                  >
                    {Math.round(s.opportunityScore)}
                  </span>
                </div>
                <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>
                  {s.sector}
                </div>
                <div style={{ fontSize: "13px", color: "#4b5563" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span>Momentum</span>
                    <span style={{ fontWeight: 500 }}>{s.momentumScore.toFixed(1)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span>Valuation</span>
                    <span style={{ fontWeight: 500 }}>{s.valuationScore.toFixed(1)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Growth</span>
                    <span style={{ fontWeight: 500 }}>{s.growthScore.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sector Rankings */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>
              Sector Rankings
            </h2>
            <div style={{ display: "flex", gap: "0", border: "1px solid #d1d5db", borderRadius: "6px", overflow: "hidden" }}>
              <button
                onClick={() => setView("chart")}
                style={{
                  padding: "6px 14px",
                  fontSize: "13px",
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  background: view === "chart" ? "#f3f4f6" : "#fff",
                  color: view === "chart" ? "#1a1a1a" : "#6b7280",
                }}
              >
                Chart
              </button>
              <button
                onClick={() => setView("table")}
                style={{
                  padding: "6px 14px",
                  fontSize: "13px",
                  fontWeight: 500,
                  border: "none",
                  borderLeft: "1px solid #d1d5db",
                  cursor: "pointer",
                  background: view === "table" ? "#f3f4f6" : "#fff",
                  color: view === "table" ? "#1a1a1a" : "#6b7280",
                }}
              >
                Table
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "24px" }}>
            {/* Chart or Table */}
            <div style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: "10px", padding: "20px" }}>
              {view === "chart" ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "#6b7280" }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 12, fill: "#4b5563" }}
                    />
                    <Tooltip
                      formatter={(value) => [Number(value).toFixed(1), "Score"]}
                      contentStyle={{ borderRadius: "8px", fontSize: "13px" }}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={index} fill={barColor(entry.score)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ padding: "8px", textAlign: "left" }}>Rank</th>
                      <th style={{ padding: "8px", textAlign: "left" }}>Sector</th>
                      <th style={{ padding: "8px", textAlign: "right" }}>Score</th>
                      <th style={{ padding: "8px", textAlign: "right" }}>Mom</th>
                      <th style={{ padding: "8px", textAlign: "right" }}>Val</th>
                      <th style={{ padding: "8px", textAlign: "right" }}>Grow</th>
                      <th style={{ padding: "8px", textAlign: "right" }}>Innov</th>
                      <th style={{ padding: "8px", textAlign: "right" }}>Macro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scores.map((s, i) => (
                      <tr key={s.sector} style={{ borderBottom: i < scores.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                        <td style={{ padding: "8px", color: "#9ca3af" }}>{s.rank}</td>
                        <td style={{ padding: "8px", fontWeight: 500 }}>{s.sector}</td>
                        <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: barColor(s.opportunityScore) }}>{s.opportunityScore.toFixed(1)}</td>
                        <td style={{ padding: "8px", textAlign: "right", color: barColor(s.momentumScore) }}>{s.momentumScore.toFixed(1)}</td>
                        <td style={{ padding: "8px", textAlign: "right", color: barColor(s.valuationScore) }}>{s.valuationScore.toFixed(1)}</td>
                        <td style={{ padding: "8px", textAlign: "right", color: barColor(s.growthScore) }}>{s.growthScore.toFixed(1)}</td>
                        <td style={{ padding: "8px", textAlign: "right", color: barColor(s.innovationScore) }}>{s.innovationScore.toFixed(1)}</td>
                        <td style={{ padding: "8px", textAlign: "right", color: barColor(s.macroScore) }}>{s.macroScore.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Distribution Sidebar */}
            <div style={{ width: "200px", flexShrink: 0 }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
                Distribution
              </h3>
              <div style={{ marginBottom: "8px" }}>
                <div style={{ fontSize: "13px", color: "#6b7280" }}>Average</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: barColor(avg) }}>{avg.toFixed(1)}</div>
              </div>
              <div style={{ marginBottom: "8px" }}>
                <div style={{ fontSize: "13px", color: "#6b7280" }}>Spread</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#f97316" }}>{(max - min).toFixed(1)}</div>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "13px", color: "#6b7280" }}>Range</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#3b82f6" }}>
                  {min.toFixed(1)}–{max.toFixed(1)}
                </div>
              </div>
              {topDrivers.length > 0 && (
                <div style={{ fontSize: "12px", color: "#6b7280", borderTop: "1px solid #e5e7eb", paddingTop: "8px" }}>
                  Top sector driven by: {topDrivers.join(", ")}
                </div>
              )}
            </div>
          </div>

          {/* Score Components */}
          <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "32px 0 16px" }}>
            Score Components
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Radar Chart */}
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
                Component Radar
              </h3>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "13px", color: "#6b7280" }}>Compare sectors</label>
                <select
                  multiple
                  value={compareSelections}
                  onChange={(e) =>
                    setCompareSelections(
                      Array.from(e.target.selectedOptions, (o) => o.value)
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "6px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "13px",
                    height: "80px",
                    marginTop: "4px",
                  }}
                >
                  {scores.map((s) => (
                    <option key={s.sector} value={s.sector}>
                      {s.sector}
                    </option>
                  ))}
                </select>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fill: "#4b5563" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  {radarSectors.map((s, i) => (
                    <Radar
                      key={s.sector}
                      name={s.sector}
                      dataKey={s.sector}
                      stroke={radarColors[i % radarColors.length]}
                      fill={radarColors[i % radarColors.length]}
                      fillOpacity={0.15}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Score Heatmap */}
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>
                Score Heatmap
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr>
                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600 }}>Sector</th>
                    <th style={{ padding: "6px 4px", textAlign: "center", fontWeight: 600 }}>Mom</th>
                    <th style={{ padding: "6px 4px", textAlign: "center", fontWeight: 600 }}>Val</th>
                    <th style={{ padding: "6px 4px", textAlign: "center", fontWeight: 600 }}>Grw</th>
                    <th style={{ padding: "6px 4px", textAlign: "center", fontWeight: 600 }}>Inn</th>
                    <th style={{ padding: "6px 4px", textAlign: "center", fontWeight: 600 }}>Mac</th>
                    <th style={{ padding: "6px 4px", textAlign: "center", fontWeight: 600 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((s) => (
                    <tr key={s.sector}>
                      <td style={{ padding: "4px 8px", fontWeight: 500, whiteSpace: "nowrap", fontSize: "11px" }}>
                        {s.sector.length > 18 ? s.sector.slice(0, 16) + "\u2026" : s.sector}
                      </td>
                      {[
                        s.momentumScore,
                        s.valuationScore,
                        s.growthScore,
                        s.innovationScore,
                        s.macroScore,
                        s.opportunityScore,
                      ].map((val, i) => (
                        <td
                          key={i}
                          style={{
                            padding: "4px",
                            textAlign: "center",
                            background: heatColor(val),
                            color: heatText(val),
                            fontWeight: 600,
                            fontSize: "11px",
                            borderRadius: "3px",
                          }}
                        >
                          {Math.round(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
