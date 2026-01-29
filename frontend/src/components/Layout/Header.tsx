import { Group, Title, Button, Text } from '@mantine/core';
import { useClearCache, useCacheInfo } from '../../hooks/useScores';

interface HeaderProps {
  onRefresh: () => void;
}

export function Header({ onRefresh }: HeaderProps) {
  const { data: cacheInfo } = useCacheInfo();
  const clearCacheMutation = useClearCache();

  return (
    <Group h="100%" px="md" justify="space-between">
      <Title order={3}>Sector Opportunity Analyzer</Title>

      <Group gap="md">
        {cacheInfo && (
          <Text size="sm" c="dimmed">
            Cache: {cacheInfo.valid_files} files ({cacheInfo.total_size_mb.toFixed(2)} MB)
          </Text>
        )}
        <Button
          variant="subtle"
          size="sm"
          onClick={onRefresh}
        >
          Refresh Data
        </Button>
        <Button
          variant="light"
          size="sm"
          color="red"
          loading={clearCacheMutation.isPending}
          onClick={() => clearCacheMutation.mutate()}
        >
          Clear Cache
        </Button>
      </Group>
    </Group>
  );
}
