import {
  Modal,
  Text,
  Title,
  Badge,
  Stack,
  Group,
  Table,
  Divider,
  Accordion,
  Paper,
  ThemeIcon,
} from '@mantine/core';
import {
  IconTrendingUp,
  IconCoin,
  IconUsers,
  IconBulb,
  IconChartLine,
} from '@tabler/icons-react';
import { INDICATORS } from '../../constants/indicators';

interface MethodologyModalProps {
  opened: boolean;
  onClose: () => void;
}

const INDICATOR_ICONS: Record<string, React.ReactNode> = {
  momentum: <IconTrendingUp size={20} />,
  valuation: <IconCoin size={20} />,
  growth: <IconUsers size={20} />,
  innovation: <IconBulb size={20} />,
  macro: <IconChartLine size={20} />,
};

const INDICATOR_COLORS: Record<string, string> = {
  momentum: 'blue',
  valuation: 'green',
  growth: 'orange',
  innovation: 'violet',
  macro: 'cyan',
};

export function MethodologyModal({ opened, onClose }: MethodologyModalProps) {
  const indicators = Object.values(INDICATORS);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Title order={2}>How Scoring Works</Title>}
      size="xl"
    >
      <Stack gap="lg">
        <Text>
          The Opportunity Score (0-100) is calculated as a weighted average of five component
          scores. Each component analyzes a different dimension of sector attractiveness.
        </Text>

        <Paper withBorder p="md" radius="md" bg="gray.0">
          <Text size="sm" fw={500} mb="xs">
            Formula:
          </Text>
          <Text size="sm" style={{ fontFamily: 'monospace' }}>
            Opportunity Score = (Momentum × 0.25) + (Valuation × 0.20) + (Growth × 0.20) +
            (Innovation × 0.20) + (Macro × 0.15)
          </Text>
        </Paper>

        <Divider label="Component Weights" labelPosition="left" />

        <Table withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Component</Table.Th>
              <Table.Th>Default Weight</Table.Th>
              <Table.Th>Data Source</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {indicators.map((ind) => (
              <Table.Tr key={ind.id}>
                <Table.Td>
                  <Group gap="xs">
                    <ThemeIcon size="sm" color={INDICATOR_COLORS[ind.id]} variant="light">
                      {INDICATOR_ICONS[ind.id]}
                    </ThemeIcon>
                    <Text fw={500}>{ind.name}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge color={INDICATOR_COLORS[ind.id]}>{ind.defaultWeight}</Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {ind.dataSource.split(' - ')[0]}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Divider label="Detailed Explanations" labelPosition="left" />

        <Accordion variant="separated">
          {indicators.map((ind) => (
            <Accordion.Item key={ind.id} value={ind.id}>
              <Accordion.Control
                icon={
                  <ThemeIcon size="sm" color={INDICATOR_COLORS[ind.id]} variant="light">
                    {INDICATOR_ICONS[ind.id]}
                  </ThemeIcon>
                }
              >
                <Group>
                  <Text fw={500}>{ind.name}</Text>
                  <Badge size="sm" color={INDICATOR_COLORS[ind.id]} variant="light">
                    {ind.defaultWeight}
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  <Text fw={500}>{ind.summary}</Text>
                  <Text size="sm" c="dimmed">
                    {ind.description}
                  </Text>

                  {ind.components.length > 0 && (
                    <>
                      <Text size="sm" fw={500}>
                        Components:
                      </Text>
                      <Table withTableBorder withColumnBorders>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Name</Table.Th>
                            <Table.Th>Weight</Table.Th>
                            <Table.Th>Calculation</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {ind.components.map((comp) => (
                            <Table.Tr key={comp.name}>
                              <Table.Td>{comp.name}</Table.Td>
                              <Table.Td>{comp.weight}</Table.Td>
                              <Table.Td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                {comp.calculation}
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </>
                  )}

                  <Group grow>
                    <Paper withBorder p="xs" radius="sm">
                      <Text size="xs" c="green" fw={500}>
                        High Score (70+):
                      </Text>
                      <Text size="xs">{ind.interpretationHigh}</Text>
                    </Paper>
                    <Paper withBorder p="xs" radius="sm">
                      <Text size="xs" c="red" fw={500}>
                        Low Score (&lt;30):
                      </Text>
                      <Text size="xs">{ind.interpretationLow}</Text>
                    </Paper>
                  </Group>

                  {ind.caveat && (
                    <Text size="xs" c="yellow.8" fs="italic">
                      Note: {ind.caveat}
                    </Text>
                  )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>

        <Divider label="Normalization" labelPosition="left" />

        <Text size="sm">
          All scores use <strong>Z-score normalization</strong> for robustness against outliers:
        </Text>
        <Stack gap="xs">
          <Text size="sm">• Mean performance across sectors = 50</Text>
          <Text size="sm">• One standard deviation above mean ≈ 65</Text>
          <Text size="sm">• One standard deviation below mean ≈ 35</Text>
          <Text size="sm">• Scores are clamped to 0-100 range</Text>
        </Stack>
      </Stack>
    </Modal>
  );
}
