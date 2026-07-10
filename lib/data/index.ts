import { getDataSource } from "@/lib/data-source";

import { mockDataSources } from "./mock-data-source";
import { serverDataSources } from "./server-data-source";
import type { DataSources } from "./types";

export type {
  CreateUploadUrlInput,
  CreateUploadUrlResponse,
  CurrentParticipation,
  DataSources,
  DiscardUploadInput,
  DiscardUploadResponse,
} from "./types";

export const dataSources: DataSources =
  getDataSource() === "mock" ? mockDataSources : serverDataSources;
