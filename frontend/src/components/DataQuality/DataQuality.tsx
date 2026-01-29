import { Paper, Title, Group, Badge, Text, Stack, Loader } from '@mantine/core';
import { useDataQuality } from '../../hooks/useScores';

const STATUS_CONFIG = {
  ok: { color: 'green', emoji: '✅' },
  warning: { color: 'yellow', emoji: '⚠️' },
  error: { color: 'red', emoji: '❌' },
} as const;

export function DataQuality() {
  const { data, isLoading, error } = useDataQuality();

  if (isLoading) {
    return (
      <Paper shadow="xs" p="md" withBorder>
        <Group>
          <Loader size="sm" />
          <Text>Checking data sources...</Text>
        </Group>
      </Paper>
    );
  }

  if (error || !data) {
    return (
      <Paper shadow="xs" p="md" withBorder>
        <Group>
          <Badge color="red">Error</Badge>
          <Text>Failed to load data quality information</Text>
        </Group>
      </Paper>
    );
  }

  const overallConfig = STATUS_CONFIG[data.overall_status];

  return (
    <Paper shadow="xs" p="md" withBorder>
      <Group justify="space-between" mb="md">
        <Title order={4}>Data Sources</Title>
        <Badge color={overallConfig.color} size="lg">
          {overallConfig.emoji} {data.overall_status.toUpperCase()}
        </Badge>
      </Group>

      <Stack gap="sm">
        {data.sources.map((source) => {
          const config = STATUS_CONFIG[source.status];
          return (
            <Group key={source.name} justify="space-between">
              <Group gap="xs">
                <Text>{config.emoji}</Text>
                <Text fw={500}>{source.name}</Text>
              </Group>
              <Text size="sm" c="dimmed">
                {source.message}
              </Text>
            </Group>
          );
        })}
      </Stack>
    </Paper>
  );
}
