import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { SectorScore } from '../../types';

interface RankingsBarChartProps {
  scores: SectorScore[];
  onSelectSector: (sector: string) => void;
}

// Color scale from red to green
function getScoreColor(score: number): string {
  // Normalize to 0-1
  const normalized = Math.max(0, Math.min(100, score)) / 100;
  // Interpolate between red (0) and green (1)
  const r = Math.round(255 * (1 - normalized));
  const g = Math.round(255 * normalized);
  return `rgb(${r}, ${g}, 80)`;
}

export function RankingsBarChart({ scores, onSelectSector }: RankingsBarChartProps) {
  const data = scores.map((s) => ({
    sector: s.sector,
    score: s.opportunity_score,
    rank: s.rank,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
      >
        <XAxis type="number" domain={[0, 100]} />
        <YAxis
          type="category"
          dataKey="sector"
          tick={{ fontSize: 12 }}
          width={110}
        />
        <Tooltip
          formatter={(value: number) => [value.toFixed(1), 'Score']}
          labelFormatter={(label) => `${label}`}
        />
        <Bar
          dataKey="score"
          onClick={(data) => onSelectSector(data.sector)}
          style={{ cursor: 'pointer' }}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
