import { Stack, Text, Slider, Button, Paper, Badge, Group } from '@mantine/core';
import type { Weights } from '../../types';

interface SidebarProps {
  weights: Weights;
  totalWeight: number;
  onWeightChange: (key: keyof Weights, value: number) => void;
  onReset: () => void;
}

const WEIGHT_LABELS: Record<keyof Weights, { label: string; color: string }> = {
  momentum: { label: 'Momentum', color: 'blue' },
  valuation: { label: 'Valuation', color: 'green' },
  growth: { label: 'Growth', color: 'orange' },
  innovation: { label: 'Innovation', color: 'purple' },
  macro: { label: 'Macro', color: 'cyan' },
};

export function Sidebar({ weights, totalWeight, onWeightChange, onReset }: SidebarProps) {
  return (
    <Stack gap="lg">
      <div>
        <Text fw={600} size="lg" mb="xs">Score Weights</Text>
        <Text size="sm" c="dimmed">
          Adjust the importance of each factor. Weights are automatically normalized.
        </Text>
      </div>

      <Paper p="sm" withBorder>
        <Group justify="space-between" mb="xs">
          <Text size="sm">Total Weight</Text>
          <Badge color={Math.abs(totalWeight - 1) < 0.01 ? 'green' : 'yellow'}>
            {(totalWeight * 100).toFixed(0)}%
          </Badge>
        </Group>
        <Text size="xs" c="dimmed">
          Will be normalized to 100%
        </Text>
      </Paper>

      <Stack gap="md">
        {(Object.keys(weights) as Array<keyof Weights>).map((key) => {
          const { label, color } = WEIGHT_LABELS[key];
          const percentage = ((weights[key] / totalWeight) * 100) || 0;

          return (
            <div key={key}>
              <Group justify="space-between" mb={4}>
                <Text size="sm" fw={500}>{label}</Text>
                <Text size="sm" c="dimmed">
                  {(weights[key] * 100).toFixed(0)}% → {percentage.toFixed(0)}%
                </Text>
              </Group>
              <Slider
                value={weights[key] * 100}
                onChange={(v) => onWeightChange(key, v / 100)}
                min={0}
                max={100}
                step={5}
                color={color}
                marks={[
                  { value: 0, label: '0' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' },
                ]}
              />
            </div>
          );
        })}
      </Stack>

      <Button variant="outline" onClick={onReset}>
        Reset to Defaults
      </Button>
    </Stack>
  );
}
