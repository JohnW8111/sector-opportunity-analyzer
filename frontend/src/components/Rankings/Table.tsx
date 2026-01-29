import { Table, Badge, Text, Group, Progress, Tooltip, ActionIcon } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import type { SectorScore } from '../../types';
import { INDICATOR_TOOLTIPS } from '../../constants/indicators';

interface RankingsTableProps {
  scores: SectorScore[];
  onSelectSector: (sector: string) => void;
  onOpenIndicatorInfo?: (indicatorId: string) => void;
}

function ColumnHeader({
  label,
  indicatorId,
  onInfoClick,
}: {
  label: string;
  indicatorId?: string;
  onInfoClick?: (id: string) => void;
}) {
  if (!indicatorId || !onInfoClick) {
    return <>{label}</>;
  }

  return (
    <Group gap={4} wrap="nowrap">
      {label}
      <Tooltip label={INDICATOR_TOOLTIPS[indicatorId]} withArrow>
        <ActionIcon
          size="xs"
          variant="subtle"
          color="gray"
          onClick={(e) => {
            e.stopPropagation();
            onInfoClick(indicatorId);
          }}
        >
          <IconInfoCircle size={14} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'green';
  if (score >= 50) return 'yellow';
  if (score >= 30) return 'orange';
  return 'red';
}

export function RankingsTable({ scores, onSelectSector, onOpenIndicatorInfo }: RankingsTableProps) {
  return (
    <Table highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Rank</Table.Th>
          <Table.Th>Sector</Table.Th>
          <Table.Th>
            <ColumnHeader label="Score" indicatorId="opportunity_score" onInfoClick={onOpenIndicatorInfo} />
          </Table.Th>
          <Table.Th>
            <ColumnHeader label="Momentum" indicatorId="momentum" onInfoClick={onOpenIndicatorInfo} />
          </Table.Th>
          <Table.Th>
            <ColumnHeader label="Valuation" indicatorId="valuation" onInfoClick={onOpenIndicatorInfo} />
          </Table.Th>
          <Table.Th>
            <ColumnHeader label="Growth" indicatorId="growth" onInfoClick={onOpenIndicatorInfo} />
          </Table.Th>
          <Table.Th>
            <ColumnHeader label="Innovation" indicatorId="innovation" onInfoClick={onOpenIndicatorInfo} />
          </Table.Th>
          <Table.Th>
            <ColumnHeader label="Macro" indicatorId="macro" onInfoClick={onOpenIndicatorInfo} />
          </Table.Th>
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
