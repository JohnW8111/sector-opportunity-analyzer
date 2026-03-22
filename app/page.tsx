import { fetchAllData } from "@/lib/fetch-all-data";
import { calculateScores } from "@/lib/analysis/scoring";
import Dashboard from "./components/Dashboard";

export const revalidate = 43200; // 12 hours

export default async function Page() {
  const allData = await fetchAllData();
  const scores = calculateScores(allData);

  return <Dashboard initialScores={scores} allData={JSON.stringify(allData)} />;
}
