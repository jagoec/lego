import type { MorpheusAnalysis } from './types.js';

/**
 * Parse morpheus "Perseus format" output into structured analyses.
 *
 * Input looks like (one <NL>…</NL> record per analysis):
 *
 * ```
 * <NL>N cactus  masc nom sg\t\t\tus_i</NL>
 * <NL>V feminam,femina  3rd sg pres ind act\t\ta_ae</NL>
 * ```
 *
 * Implemented by the morpheus-setup agent. Requirements:
 * - handle slash groups (`nom/voc/acc` → cases: ['nom','voc','acc'])
 * - map every known ending token to the enums in types.ts
 * - preserve unrecognized tokens verbatim in `features`
 * - tolerate multiple records and empty input (return [])
 */
export function parseMorpheus(output: string): MorpheusAnalysis[] {
  throw new Error('parseMorpheus: not implemented yet (morpheus-setup agent)');
}
