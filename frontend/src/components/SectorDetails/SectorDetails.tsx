import {
  Paper,
  Title,
  Text,
  Group,
  Badge,
  Grid,
  Stack,
  CloseButton,
  Progress,
  Divider,
} from '@mantine/core';
import type { SectorScore } from '../../types';

interface SectorDetailsProps {
  score?: SectorScore;
  onClose: () => void;
}

function getScoreIndicator(value: number): { emoji: string; color: string } {
  if (value >= 70) return { emoji: '🟢', color: 'green' };
  if (value >= 50) return { emoji: '🟡', color: 'yellow' };
  if (value >= 30) return { emoji: '🟠', color: 'orange' };
  return { emoji: '🔴', color: 'red' };
}

function formatMetric(value: number | null, suffix = ''): string {
  if (value === null) return 'N/A';
  return `${value.toFixed(2)}${suffix}`;
}

export function SectorDetails({ score, onClose }: SectorDetailsProps) {
  if (!score) return null;

  const components = [
    { label: 'Momentum', value: score.momentum_score },
    { label: 'Valuation', value: score.valuation_score },
    { label: 'Growth', value: score.growth_score },
    { label: 'Innovation', value: score.innovation_score },
    { label: 'Macro', value: score.macro_score },
  ];

  const metrics = [
    { label: '3-Month Return', value: score.price_return_3mo, suffix: '%' },
    { label: '6-Month Return', value: score.price_return_6mo, suffix: '%' },
    { label: '12-Month Return', value: score.price_return_12mo, suffix: '%' },
    { label: 'Relative Strength', value: score.relative_strength, suffix: '' },
    { label: 'Forward P/E', value: score.forward_pe, suffix: 'x' },
    { label: 'Employment Growth', value: score.employment_growth, suffix: '%' },
    { label: 'R&D Intensity', value: score.rd_intensity ? score.rd_intensity * 100 : null, suffix: '%' },
  ];

  return (
    <Paper shadow="md" p="lg" withBorder>
      <Group justify="space-between" mb="md">
        <Group>
          <Badge size="xl" variant="filled" color="blue">
            #{score.rank}
          </Badge>
          <Title order={3}>{score.sector}</Title>
        </Group>
        <CloseButton onClick={onClose} />
      </Group>

      <Group mb="lg">
        <Text size="lg" fw={600}>
          Opportunity Score:
        </Text>
        <Progress value={score.opportunity_score} size="xl" w={200} />
        <Text size="lg" fw={700} c="blue">
          {score.opportunity_score.toFixed(1)}
        </Text>
      </Group>

      <Divider label="Component Scores" labelPosition="center" mb="md" />

      <Grid mb="lg">
        {components.map(({ label, value }) => {
          const { emoji, color } = getScoreIndicator(value);
          return (
            <Grid.Col key={label} span={{ base: 6, sm: 4, md: 2.4 }}>
              <Paper p="sm" withBorder>
                <Text size="sm" c="dimmed" mb={4}>
                  {label}
                </Text>
                <Group gap="xs">
                  <Text size="lg" fw={600}>
                    {emoji}
                  </Text>
                  <Text size="lg" fw={600} c={color}>
                    {value.toFixed(1)}
                  </Text>
                </Group>
              </Paper>
            </Grid.Col>
          );
        })}
      </Grid>

      <Divider label="Raw Metrics" labelPosition="center" mb="md" />

      <Grid>
        {metrics.map(({ label, value, suffix }) => (
          <Grid.Col key={label} span={{ base: 6, sm: 4, md: 3 }}>
            <Stack gap={2}>
              <Text size="sm" c="dimmed">
                {label}
              </Text>
              <Text size="md" fw={500}>
                {formatMetric(value, suffix)}
              </Text>
            </Stack>
          </Grid.Col>
        ))}
      </Grid>
    </Paper>
  );
}
