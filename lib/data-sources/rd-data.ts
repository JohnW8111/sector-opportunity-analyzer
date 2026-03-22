// Hardcoded R&D intensity values based on historical Damodaran averages.
// These change ~1x/year. Updating annually is sufficient.

import type { RDData } from "../types";

export function getRDData(): RDData {
  return {
    "Information Technology": 0.15,
    "Health Care": 0.12,
    "Communication Services": 0.08,
    "Consumer Discretionary": 0.04,
    "Industrials": 0.03,
    "Materials": 0.02,
    "Consumer Staples": 0.02,
    "Financials": 0.01,
    "Energy": 0.01,
    "Utilities": 0.005,
    "Real Estate": 0.001,
  };
}
