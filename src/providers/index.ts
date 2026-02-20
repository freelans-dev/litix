export type {
  ProviderName,
  SearchByCnjOptions,
  SearchByDocumentOptions,
  MonitoringOptions,
  AsyncRequestResult,
  ILegalDataProvider,
} from './provider.interface.js';
export type { ProviderStatus } from './provider-status.js';
export { EscavadorProvider } from './escavador/index.js';
export { PredictusProvider } from './predictus/index.js';
export { DataJudProvider } from './datajud/index.js';
export {
  cnjToTribunalAlias,
  ALL_DATAJUD_ALIASES,
  COMMON_DATAJUD_ALIASES,
} from './datajud/index.js';
