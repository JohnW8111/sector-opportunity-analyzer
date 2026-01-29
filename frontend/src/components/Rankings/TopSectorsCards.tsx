import { Grid, Paper, Text, Group, Badge, RingProgress, Stack } from '@mantine/core';
import type { SectorScore } from '../../types';

interface TopSectorsCardsProps {
  scores: SectorScore[];
}

const RANK_COLORS = ['gold', 'gray', '#cd7f32']; // Gold, Silver, Bronze

export function TopSectorsCards({ scores }: TopSectorsCardsProps) {
  return (
    <Grid>
      {scores.map((score, index) => (
        <Grid.Col key={score.sector} span={{ base: 12, sm: 4 }}>
          <Paper shadow="sm" p="lg" withBorder>
            <Group justify="space-between" mb="md">
              <Badge
                size="lg"
                variant="filled"
                style={{ backgroundColor: RANK_COLORS[index] }}
              >
                #{score.rank}
              </Badge>
              <RingProgress
                size={60}
                thickness={6}
                sections={[{ value: score.opportunity_score, color: 'blue' }]}
                label={
                  <Text size="xs" ta="center" fw={700}>
                    {score.opportunity_score.toFixed(0)}
                  </Text>
                }
              />
            </Group>

            <Text fw={600} size="lg" mb="xs">
              {score.sector}
            </Text>

            <Stack gap={4}>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Momentum</Text>
                <Text size="sm">{score.momentum_score.toFixed(1)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Valuation</Text>
                <Text size="sm">{score.valuation_score.toFixed(1)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Growth</Text>
                <Text size="sm">{score.growth_score.toFixed(1)}</Text>
              </Group>
            </Stack>
          </Paper>
        </Grid.Col>
      ))}
    </Grid>
  );
}
