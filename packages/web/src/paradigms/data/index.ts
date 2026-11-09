import type { ParadigmTable, TableId } from '../types';
import {
  ADJ12_ER,
  ADJ12_US,
  ADJ3_ONE,
  ADJ3_THREE,
  ADJ3_TWO,
} from './adjectives';
import {
  NOUN1,
  NOUN2M,
  NOUN2N,
  NOUN3C_MF,
  NOUN3C_N,
  NOUN3I_MF,
  NOUN3I_N,
  NOUN4_MF,
  NOUN4_N,
  NOUN5,
} from './nouns';
import {
  PRON_EGO,
  PRON_HIC,
  PRON_ILLE,
  PRON_IPSE,
  PRON_IS,
  PRON_ISTE,
  PRON_QUIS,
  PRON_QUI,
  PRON_SE,
  PRON_TU,
} from './pronouns';
import {
  ESSE,
  FERRE,
  IRE,
  POSSE,
  VERB1,
  VERB2,
  VERB3,
  VERB3IO,
  VERB4,
  VOLO,
} from './verbs';

/** Every paradigm table, keyed by id — the lookup target of the stem map. */
export const TABLES: Readonly<Record<TableId, ParadigmTable>> = {
  noun1: NOUN1,
  noun2m: NOUN2M,
  noun2n: NOUN2N,
  'noun3c-mf': NOUN3C_MF,
  'noun3c-n': NOUN3C_N,
  'noun3i-mf': NOUN3I_MF,
  'noun3i-n': NOUN3I_N,
  'noun4-mf': NOUN4_MF,
  'noun4-n': NOUN4_N,
  noun5: NOUN5,
  'adj12-us': ADJ12_US,
  'adj12-er': ADJ12_ER,
  'adj3-three': ADJ3_THREE,
  'adj3-two': ADJ3_TWO,
  'adj3-one': ADJ3_ONE,
  verb1: VERB1,
  verb2: VERB2,
  verb3: VERB3,
  verb3io: VERB3IO,
  verb4: VERB4,
  esse: ESSE,
  posse: POSSE,
  ire: IRE,
  ferre: FERRE,
  volo: VOLO,
  'pron-ego': PRON_EGO,
  'pron-tu': PRON_TU,
  'pron-is': PRON_IS,
  'pron-hic': PRON_HIC,
  'pron-ille': PRON_ILLE,
  'pron-iste': PRON_ISTE,
  'pron-ipse': PRON_IPSE,
  'pron-qui': PRON_QUI,
  'pron-se': PRON_SE,
  'pron-quis': PRON_QUIS,
};

export function getTable(id: TableId): ParadigmTable {
  return TABLES[id];
}
