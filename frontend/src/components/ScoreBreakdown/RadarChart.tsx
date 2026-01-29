import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Text, Select, Stack } from '@mantine/core';
import { useState, useMemo } from 'react';
import type { SectorScore } from '../../types';

interface RadarChartProps {
  scores: SectorScore[];
  selectedSector: string | null;
}

const COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f97316', // orange
  '#a855f7', // purple
  '#06b6d4', // cyan
];

export function RadarChart({ scores, selectedSector }: RadarChartProps) {
  const [compareSectors, setCompareSectors] = useState<string[]>([]);

  const sectorsToShow = useMemo(() => {
    const sectors = new Set<string>();
    if (selectedSector) sectors.add(selectedSector);
    compareSectors.forEach((s) => sectors.add(s));
    // If nothing selected, show top 3
    if (sectors.size === 0) {
      scores.slice(0, 3).forEach((s) => sectors.add(s.sector));
    }
    return Array.from(sectors);
  }, [selectedSector, compareSectors, scores]);

  const data = useMemo(() => {
    const components = ['momentum', 'valuation', 'growth', 'innovation', 'macro'];
    return components.map((comp) => {
      const entry: Record<string, string | number> = {
        component: comp.charAt(0).toUpperCase() + comp.slice(1),
      };
      sectorsToShow.forEach((sector) => {
        const score = scores.find((s) => s.sector === sector);
        if (score) {
          entry[sector] = score[`${comp}_score` as keyof SectorScore] as number;
        }
      });
      return entry;
    });
  }, [scores, sectorsToShow]);

  const sectorOptions = scores.map((s) => ({
    value: s.sector,
    label: s.sector,
  }));

  return (
    <Stack gap="md">
      <Select
        label="Compare sectors"
        placeholder="Add sectors to compare"
        data={sectorOptions}
        value={null}
        onChange={(value) => {
          if (value && !compareSectors.includes(value)) {
            setCompareSectors([...compareSectors, value].slice(0, 4));
          }
        }}
        clearable
        searchable
      />

      {compareSectors.length > 0 && (
        <Text size="sm" c="dimmed">
          Comparing: {sectorsToShow.join(', ')}
        </Text>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <RechartsRadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="component" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend />
          {sectorsToShow.map((sector, index) => (
            <Radar
              key={sector}
              name={sector}
              dataKey={sector}
              stroke={COLORS[index % COLORS.length]}
              fill={COLORS[index % COLORS.length]}
              fillOpacity={0.2}
            />
          ))}
        </RechartsRadarChart>
      </ResponsiveContainer>
    </Stack>
  );
}
