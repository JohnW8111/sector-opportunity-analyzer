import { Table, Text, Box } from '@mantine/core';
import type { SectorScore } from '../../types';

interface HeatmapProps {
  scores: SectorScore[];
}

const COMPONENTS = [
  { key: 'momentum_score', label: 'Mom' },
  { key: 'valuation_score', label: 'Val' },
  { key: 'growth_score', label: 'Grw' },
  { key: 'innovation_score', label: 'Inn' },
  { key: 'macro_score', label: 'Mac' },
] as const;

function getHeatmapColor(value: number): string {
  // Red (0) -> Yellow (50) -> Green (100)
  const normalized = Math.max(0, Math.min(100, value)) / 100;

  if (normalized < 0.5) {
    // Red to Yellow
    const r = 255;
    const g = Math.round(255 * (normalized * 2));
    return `rgb(${r}, ${g}, 80)`;
  } else {
    // Yellow to Green
    const r = Math.round(255 * (1 - (normalized - 0.5) * 2));
    const g = 255;
    return `rgb(${r}, ${g}, 80)`;
  }
}

export function Heatmap({ scores }: HeatmapProps) {
  return (
    <Box style={{ overflowX: 'auto' }}>
      <Table withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Sector</Table.Th>
            {COMPONENTS.map(({ label }) => (
              <Table.Th key={label} ta="center" style={{ width: 50 }}>
                {label}
              </Table.Th>
            ))}
            <Table.Th ta="center" style={{ width: 50 }}>
              Total
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {scores.map((score) => (
            <Table.Tr key={score.sector}>
              <Table.Td>
                <Text size="sm" truncate maw={100}>
                  {score.sector}
                </Text>
              </Table.Td>
              {COMPONENTS.map(({ key }) => {
                const value = score[key] as number;
                return (
                  <Table.Td
                    key={key}
                    ta="center"
                    style={{
                      backgroundColor: getHeatmapColor(value),
                      color: value > 60 || value < 40 ? 'white' : 'black',
                    }}
                  >
                    <Text size="xs" fw={500}>
                      {value.toFixed(0)}
                    </Text>
                  </Table.Td>
                );
              })}
              <Table.Td
                ta="center"
                style={{
                  backgroundColor: getHeatmapColor(score.opportunity_score),
                  color:
                    score.opportunity_score > 60 || score.opportunity_score < 40
                      ? 'white'
                      : 'black',
                }}
              >
                <Text size="xs" fw={700}>
                  {score.opportunity_score.toFixed(0)}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  );
}
