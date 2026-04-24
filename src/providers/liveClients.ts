import { apiConfig } from "../config/apiConfig";
import { ApiFootballClient } from "./apiFootballClient";
import { TheOddsApiClient } from "./theOddsApiClient";

export function createLiveClients() {
  return {
    odds: apiConfig.oddsApiKey ? new TheOddsApiClient(apiConfig.oddsApiKey) : undefined,
    football: apiConfig.apiFootballKey ? new ApiFootballClient(apiConfig.apiFootballKey) : undefined
  };
}
