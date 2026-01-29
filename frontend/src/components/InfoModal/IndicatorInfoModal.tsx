import {
  Modal,
  Text,
  Title,
  Badge,
  Stack,
  Group,
  Table,
  Divider,
  Alert,
  Paper,
} from '@mantine/core';
import { IconInfoCircle, IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import type { IndicatorInfo } from '../../constants/indicators';

interface IndicatorInfoModalProps {
  opened: boolean;
  onClose: () => void;
  indicator: IndicatorInfo | null;
}

export function IndicatorInfoModal({ opened, onClose, indicator }: IndicatorInfoModalProps) {
  if (!indicator) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <Title order={3}>{indicator.name}</Title>
          <Badge color="blue" variant="light">
            Default: {indicator.defaultWeight}
          </Badge>
        </Group>
      }
      size="lg"
    >
      <Stack gap="md">
        <Text size="lg" fw={500}>
          {indicator.summary}
        </Text>

        <Text c="dimmed">{indicator.description}</Text>

        <Divider label="Components" labelPosition="left" />

        {indicator.components.length > 0 && (
          <Table withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Component</Table.Th>
                <Table.Th>Weight</Table.Th>
                <Table.Th>Calculation</Table.Th>
                <Table.Th>Source</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {indicator.components.map((comp) => (
                <Table.Tr key={comp.name}>
                  <Table.Td fw={500}>{comp.name}</Table.Td>
                  <Table.Td>{comp.weight}</Table.Td>
                  <Table.Td>
                    <Text size="sm" style={{ fontFamily: 'monospace' }}>
                      {comp.calculation}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" variant="outline">
                      {comp.source}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

        <Divider label="Interpretation" labelPosition="left" />

        <Group grow>
          <Paper withBorder p="sm" radius="md">
            <Group gap="xs" mb="xs">
              <IconTrendingUp size={18} color="green" />
              <Text size="sm" fw={600} c="green">
                High Score (70+)
              </Text>
            </Group>
            <Text size="sm">{indicator.interpretationHigh}</Text>
          </Paper>

          <Paper withBorder p="sm" radius="md">
            <Group gap="xs" mb="xs">
              <IconTrendingDown size={18} color="red" />
              <Text size="sm" fw={600} c="red">
                Low Score (&lt;30)
              </Text>
            </Group>
            <Text size="sm">{indicator.interpretationLow}</Text>
          </Paper>
        </Group>

        <Divider label="Data Source" labelPosition="left" />

        <Text size="sm">
          <strong>Source:</strong> {indicator.dataSource}
        </Text>

        {indicator.caveat && (
          <Alert icon={<IconInfoCircle size={16} />} color="yellow" variant="light">
            <Text size="sm">{indicator.caveat}</Text>
          </Alert>
        )}
      </Stack>
    </Modal>
  );
}
