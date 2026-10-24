import { fetchAllData } from "@/lib/fetch-all-data";
import { calculateScores } from "@/lib/analysis/scoring";
import Dashboard from "./components/Dashboard";
import { getEmploymentQuality } from "@/lib/employment-quality";

export const revalidate = 43200; // 12 hours

export default async function Page() {
  const allData = await fetchAllData();
  const scores = calculateScores(allData);

  return <Dashboard initialScores={scores} employmentQuality={getEmploymentQuality(allData.employmentData)} />;
}
