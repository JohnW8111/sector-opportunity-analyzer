import { useState } from 'react';
import {
  AppShell,
  Container,
  Title,
  Text,
  Stack,
  Grid,
  Paper,
  Loader,
  Alert,
  SegmentedControl,
} from '@mantine/core';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { TopSectorsCards } from './components/Rankings/TopSectorsCards';
import { RankingsBarChart } from './components/Rankings/BarChart';
import { RankingsTable } from './components/Rankings/Table';
import { RadarChart } from './components/ScoreBreakdown/RadarChart';
import { Heatmap } from './components/ScoreBreakdown/Heatmap';
import { SectorDetails } from './components/SectorDetails/SectorDetails';
import { DataQuality } from './components/DataQuality/DataQuality';
import { useScores } from './hooks/useScores';
import { useWeights } from './hooks/useWeights';

function App() {
  const { weights, normalizedWeights, updateWeight, resetWeights, totalWeight } = useWeights();
  const { data, isLoading, error, refetch } = useScores(normalizedWeights);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  if (isLoading) {
    return (
      <Container size="sm" py="xl">
        <Stack align="center" gap="md">
          <Loader size="xl" />
          <Text>Loading sector data...</Text>
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="md" py="xl">
        <Alert color="red" title="Error loading data">
          {error instanceof Error ? error.message : 'Failed to load sector scores'}
        </Alert>
      </Container>
    );
  }

  const scores = data?.scores ?? [];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm' }}
      padding="md"
    >
      <AppShell.Header>
        <Header onRefresh={() => refetch()} />
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Sidebar
          weights={weights}
          totalWeight={totalWeight}
          onWeightChange={updateWeight}
          onReset={resetWeights}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="xl">
          <Stack gap="xl">
            {/* Top Sectors Overview */}
            <section>
              <Title order={2} mb="md">Top Opportunities</Title>
              <TopSectorsCards scores={scores.slice(0, 3)} />
            </section>

            {/* Rankings Section */}
            <section>
              <Paper shadow="xs" p="md" withBorder>
                <Grid align="center" mb="md">
                  <Grid.Col span="auto">
                    <Title order={3}>Sector Rankings</Title>
                  </Grid.Col>
                  <Grid.Col span="content">
                    <SegmentedControl
                      value={viewMode}
                      onChange={(v) => setViewMode(v as 'chart' | 'table')}
                      data={[
                        { label: 'Chart', value: 'chart' },
                        { label: 'Table', value: 'table' },
                      ]}
                    />
                  </Grid.Col>
                </Grid>
                {viewMode === 'chart' ? (
                  <RankingsBarChart scores={scores} onSelectSector={setSelectedSector} />
                ) : (
                  <RankingsTable scores={scores} onSelectSector={setSelectedSector} />
                )}
              </Paper>
            </section>

            {/* Score Breakdown */}
            <section>
              <Title order={2} mb="md">Score Components</Title>
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper shadow="xs" p="md" withBorder h="100%">
                    <Title order={4} mb="md">Component Radar</Title>
                    <RadarChart
                      scores={scores}
                      selectedSector={selectedSector}
                    />
                  </Paper>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper shadow="xs" p="md" withBorder h="100%">
                    <Title order={4} mb="md">Score Heatmap</Title>
                    <Heatmap scores={scores} />
                  </Paper>
                </Grid.Col>
              </Grid>
            </section>

            {/* Sector Details */}
            {selectedSector && (
              <section>
                <SectorDetails
                  score={scores.find(s => s.sector === selectedSector)}
                  onClose={() => setSelectedSector(null)}
                />
              </section>
            )}

            {/* Data Quality */}
            <section>
              <DataQuality />
            </section>
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
