export const SALVAGE_PERSISTENCE_VERSION = 1;

const GOOD_IDS = new Set(['ore', 'mach', 'weap']);

export function normalizeSalvageRecord(input) {
  if (!input || typeof input !== 'object') return null;
  const goodId = String(input.goodId || '');
  const amount = Math.floor(Number(input.amount));
  const x = Number(input.x);
  const y = Number(input.y);
  if (!GOOD_IDS.has(goodId) || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(x) || !Number.isFinite(y)) return null;

  const out = {
    id: input.id == null ? null : String(input.id),
    goodId,
    amount,
    sourceUid: input.sourceUid == null ? null : input.sourceUid,
    sourceType: input.sourceType == null ? null : String(input.sourceType),
    x,
    y
  };
  return out;
}

export function serializeSalvageRecords(records = []) {
  if (!Array.isArray(records)) return [];
  return records.map(normalizeSalvageRecord).filter(Boolean);
}

export function normalizeSalvagePersistence(input) {
  const rawSystems = input && typeof input === 'object' && input.systems && typeof input.systems === 'object'
    ? input.systems
    : {};
  const systems = {};
  for (const [key, value] of Object.entries(rawSystems)) {
    const id = Number(key);
    if (!Number.isInteger(id) || id < 0) continue;
    const records = serializeSalvageRecords(value);
    if (records.length) systems[String(id)] = records;
  }
  return { version: SALVAGE_PERSISTENCE_VERSION, systems };
}

export function createSalvagePersistence(systemEntries = {}) {
  return normalizeSalvagePersistence({
    version: SALVAGE_PERSISTENCE_VERSION,
    systems: systemEntries
  });
}

export function attachSalvagePersistenceToSave(saveData, persistence) {
  if (!saveData || typeof saveData !== 'object' || Array.isArray(saveData)) return saveData;
  return {
    ...saveData,
    salvagePersistence: normalizeSalvagePersistence(persistence)
  };
}

export function extractSalvagePersistenceFromSave(saveData) {
  return normalizeSalvagePersistence(saveData?.salvagePersistence);
}
