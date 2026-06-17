import type { DatasetMeta, JoinedModel } from './types';

// Imported as ?raw + JSON.parse so tsc does not infer a literal type over the
// file (which would slow tsc) and we own the schema here instead.
import compiledJson from './compiled-data.json?raw';

interface CompiledData {
  meta: DatasetMeta;
  models: JoinedModel[];
}

const data = JSON.parse(compiledJson) as CompiledData;

export const joinedModels: JoinedModel[] = data.models;
export const datasetMeta: DatasetMeta = data.meta;
