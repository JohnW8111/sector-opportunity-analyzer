import { Table, Badge, Text, Group, Progress } from '@mantine/core';
import type { SectorScore } from '../../types';

interface RankingsTableProps {
  scores: SectorScore[];
  onSelectSector: (sector: string) => void;
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'green';
  if (score >= 50) return 'yellow';
  if (score >= 30) return 'orange';
  return 'red';
}

export function RankingsTable({ scores, onSelectSector }: RankingsTableProps) {
  return (
    <Table highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Rank</Table.Th>
          <Table.Th>Sector</Table.Th>
          <Table.Th>Score</Table.Th>
          <Table.Th>Momentum</Table.Th>
          <Table.Th>Valuation</Table.Th>
          <Table.Th>Growth</Table.Th>
          <Table.Th>Innovation</Table.Th>
          <Table.Th>Macro</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {scores.map((score) => (
          <Table.Tr
            key={score.sector}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectSector(score.sector)}
          >
            <Table.Td>
              <Badge variant="filled" color={score.rank <= 3 ? 'green' : 'gray'}>
                #{score.rank}
              </Badge>
            </Table.Td>
            <Table.Td>
              <Text fw={500}>{score.sector}</Text>
            </Table.Td>
            <Table.Td>
              <Group gap="xs">
                <Progress
                  value={score.opportunity_score}
                  size="sm"
                  w={60}
                  color={getScoreColor(score.opportunity_score)}
                />
                <Text size="sm" fw={600}>
                  {score.opportunity_score.toFixed(1)}
                </Text>
              </Group>
            </Table.Td>
            <Table.Td>
              <Text size="sm" c={getScoreColor(score.momentum_score)}>
                {score.momentum_score.toFixed(1)}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm" c={getScoreColor(score.valuation_score)}>
                {score.valuation_score.toFixed(1)}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm" c={getScoreColor(score.growth_score)}>
                {score.growth_score.toFixed(1)}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm" c={getScoreColor(score.innovation_score)}>
                {score.innovation_score.toFixed(1)}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm" c={getScoreColor(score.macro_score)}>
                {score.macro_score.toFixed(1)}
              </Text>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
