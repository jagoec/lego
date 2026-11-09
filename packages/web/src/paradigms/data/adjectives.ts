import type { NominalColumn, NominalTable } from '../types';

/**
 * Adjective tables. Unlike nouns, one adjective table covers all three
 * genders: columns are {masc, fem, neut} × {sg, pl}.
 */

const MFN_COLUMNS: ReadonlyArray<NominalColumn> = [
  { number: 'sg', gender: 'masc' },
  { number: 'sg', gender: 'fem' },
  { number: 'sg', gender: 'neut' },
  { number: 'pl', gender: 'masc' },
  { number: 'pl', gender: 'fem' },
  { number: 'pl', gender: 'neut' },
];

export const ADJ12_US: NominalTable = {
  kind: 'nominal',
  id: 'adj12-us',
  title: '1st–2nd declension adjective · bonae',
  note: 'us-a-um type (bonus, bona, bonum)',
  columns: MFN_COLUMNS,
  rows: [
    { case: 'nom', forms: ['bonus', 'bona', 'bonum', 'bonī', 'bonae', 'bona'] },
    { case: 'gen', forms: ['bonī', 'bonae', 'bonī', 'bonōrum', 'bonārum', 'bonōrum'] },
    { case: 'dat', forms: ['bonō', 'bonae', 'bonō', 'bonīs', 'bonīs', 'bonīs'] },
    { case: 'acc', forms: ['bonum', 'bonam', 'bonum', 'bonōs', 'bonās', 'bona'] },
    { case: 'abl', forms: ['bonō', 'bonā', 'bonō', 'bonīs', 'bonīs', 'bonīs'] },
    { case: 'voc', forms: ['bone', 'bona', 'bonum', 'bonī', 'bonae', 'bona'] },
  ],
};

export const ADJ12_ER: NominalTable = {
  kind: 'nominal',
  id: 'adj12-er',
  title: '1st–2nd declension adjective (er) · pulchrae',
  note: 'er-ra-rum type (pulcher, pulchra, pulchrum); miser-type keeps the e (miser, misera, miserum)',
  columns: MFN_COLUMNS,
  rows: [
    { case: 'nom', forms: ['pulcher', 'pulchra', 'pulchrum', 'pulchrī', 'pulchrae', 'pulchra'] },
    { case: 'gen', forms: ['pulchrī', 'pulchrae', 'pulchrī', 'pulchrōrum', 'pulchrārum', 'pulchrōrum'] },
    { case: 'dat', forms: ['pulchrō', 'pulchrae', 'pulchrō', 'pulchrīs', 'pulchrīs', 'pulchrīs'] },
    { case: 'acc', forms: ['pulchrum', 'pulchram', 'pulchrum', 'pulchrōs', 'pulchrās', 'pulchra'] },
    { case: 'abl', forms: ['pulchrō', 'pulchrā', 'pulchrō', 'pulchrīs', 'pulchrīs', 'pulchrīs'] },
    { case: 'voc', forms: ['pulcher', 'pulchra', 'pulchrum', 'pulchrī', 'pulchrae', 'pulchra'] },
  ],
};

export const ADJ3_THREE: NominalTable = {
  kind: 'nominal',
  id: 'adj3-three',
  title: '3rd declension adjective (three endings) · ācrēs',
  note: 'ācer, ācris, ācre — three nominative endings, i-stem forms (gen pl -ium)',
  columns: MFN_COLUMNS,
  rows: [
    { case: 'nom', forms: ['ācer', 'ācris', 'ācre', 'ācrēs', 'ācrēs', 'ācria'] },
    { case: 'gen', forms: ['ācris', 'ācris', 'ācris', 'ācrium', 'ācrium', 'ācrium'] },
    { case: 'dat', forms: ['ācrī', 'ācrī', 'ācrī', 'ācribus', 'ācribus', 'ācribus'] },
    { case: 'acc', forms: ['ācrem', 'ācrim', 'ācre', 'ācrēs', 'ācrīs', 'ācria'] },
    { case: 'abl', forms: ['ācrī', 'ācrī', 'ācrī', 'ācribus', 'ācribus', 'ācribus'] },
    { case: 'voc', forms: ['ācer', 'ācris', 'ācre', 'ācrēs', 'ācrēs', 'ācria'] },
  ],
};

export const ADJ3_TWO: NominalTable = {
  kind: 'nominal',
  id: 'adj3-two',
  title: '3rd declension adjective (two endings) · ingentia',
  note: 'ingens, ingens (m/f), ingens (n) — ablative sg -ī, genitive plural -ium. Used as the default table when the stem does not reveal the ending count',
  columns: MFN_COLUMNS,
  rows: [
    { case: 'nom', forms: ['ingens', 'ingens', 'ingens', 'ingentēs', 'ingentēs', 'ingentia'] },
    { case: 'gen', forms: ['ingentis', 'ingentis', 'ingentis', 'ingentium', 'ingentium', 'ingentium'] },
    { case: 'dat', forms: ['ingentī', 'ingentī', 'ingentī', 'ingentibus', 'ingentibus', 'ingentibus'] },
    { case: 'acc', forms: ['ingentem', 'ingentem', 'ingens', 'ingentēs', 'ingentīs', 'ingentia'] },
    { case: 'abl', forms: ['ingentī', 'ingentī', 'ingentī', 'ingentibus', 'ingentibus', 'ingentibus'] },
    { case: 'voc', forms: ['ingens', 'ingens', 'ingens', 'ingentēs', 'ingentēs', 'ingentia'] },
  ],
};

export const ADJ3_ONE: NominalTable = {
  kind: 'nominal',
  id: 'adj3-one',
  title: '3rd declension adjective (one ending) · fēlīcēs',
  note: 'fēlīx for all three genders in the nominative; ablative sg -e (poetic -ī), genitive plural -ium',
  columns: MFN_COLUMNS,
  rows: [
    { case: 'nom', forms: ['fēlīx', 'fēlīx', 'fēlīx', 'fēlīcēs', 'fēlīcēs', 'fēlīcia'] },
    { case: 'gen', forms: ['fēlīcis', 'fēlīcis', 'fēlīcis', 'fēlīcium', 'fēlīcium', 'fēlīcium'] },
    { case: 'dat', forms: ['fēlīcī', 'fēlīcī', 'fēlīcī', 'fēlīcibus', 'fēlīcibus', 'fēlīcibus'] },
    { case: 'acc', forms: ['fēlīcem', 'fēlīcem', 'fēlīx', 'fēlīcēs', 'fēlīcīs', 'fēlīcia'] },
    { case: 'abl', forms: ['fēlīce', 'fēlīce', 'fēlīce', 'fēlīcibus', 'fēlīcibus', 'fēlīcibus'] },
    { case: 'voc', forms: ['fēlīx', 'fēlīx', 'fēlīx', 'fēlīcēs', 'fēlīcēs', 'fēlīcia'] },
  ],
};
