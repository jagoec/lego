import type { NominalTable } from '../types';

/**
 * Noun declension tables. Columns are sg/pl (nouns do not split by
 * gender within a table — gender picks the *table*, e.g. 2nd declension
 * masculine vs neuter, 3rd declension m/f vs neuter).
 *
 * Locative rows appear where conventional (1st/2nd declension; the loc
 * is identical in form to the genitive).
 */

const SG_PL = [{ number: 'sg', gender: null }, { number: 'pl', gender: null }] as const;

export const NOUN1: NominalTable = {
  kind: 'nominal',
  id: 'noun1',
  title: '1st declension · fēminae',
  note: 'mostly feminine; masculines (poēta, nauta) decline the same way',
  columns: SG_PL,
  rows: [
    { case: 'nom', forms: ['fēmina', 'fēminae'] },
    { case: 'gen', forms: ['fēminae', 'fēminārum'] },
    { case: 'dat', forms: ['fēminae', 'fēminīs'] },
    { case: 'acc', forms: ['fēminam', 'fēminās'] },
    { case: 'abl', forms: ['fēminā', 'fēminīs'] },
    { case: 'voc', forms: ['fēmina', 'fēminae'] },
    { case: 'loc', forms: ['fēminae', null] },
  ],
};

export const NOUN2M: NominalTable = {
  kind: 'nominal',
  id: 'noun2m',
  title: '2nd declension · amīcī',
  note: 'masculine; er-stems (ager → agrī, puer → puerī, vir → virī) and Greek -os names follow this pattern',
  columns: SG_PL,
  rows: [
    { case: 'nom', forms: ['amīcus', 'amīcī'] },
    { case: 'gen', forms: ['amīcī', 'amīcōrum'] },
    { case: 'dat', forms: ['amīcō', 'amīcīs'] },
    { case: 'acc', forms: ['amīcum', 'amīcōs'] },
    { case: 'abl', forms: ['amīcō', 'amīcīs'] },
    { case: 'voc', forms: ['amīce', 'amīcī'] },
    { case: 'loc', forms: ['amīcī', null] },
  ],
};

export const NOUN2N: NominalTable = {
  kind: 'nominal',
  id: 'noun2n',
  title: '2nd declension (neuter) · dōna',
  note: 'neuter: nominative, accusative and vocative are always alike; plural in -a',
  columns: SG_PL,
  rows: [
    { case: 'nom', forms: ['dōnum', 'dōna'] },
    { case: 'gen', forms: ['dōnī', 'dōnōrum'] },
    { case: 'dat', forms: ['dōnō', 'dōnīs'] },
    { case: 'acc', forms: ['dōnum', 'dōna'] },
    { case: 'abl', forms: ['dōnō', 'dōnīs'] },
    { case: 'voc', forms: ['dōnum', 'dōna'] },
    { case: 'loc', forms: ['dōnī', null] },
  ],
};

export const NOUN3C_MF: NominalTable = {
  kind: 'nominal',
  id: 'noun3c-mf',
  title: '3rd declension (consonant stems) · rēgēs',
  note: 'masculine/feminine consonant stems; genitive plural -um',
  columns: SG_PL,
  rows: [
    { case: 'nom', forms: ['rēx', 'rēgēs'] },
    { case: 'gen', forms: ['rēgis', 'rēgum'] },
    { case: 'dat', forms: ['rēgī', 'rēgibus'] },
    { case: 'acc', forms: ['rēgem', 'rēgēs'] },
    { case: 'abl', forms: ['rēge', 'rēgibus'] },
    { case: 'voc', forms: ['rēx', 'rēgēs'] },
  ],
};

export const NOUN3C_N: NominalTable = {
  kind: 'nominal',
  id: 'noun3c-n',
  title: '3rd declension (consonant stems, neuter) · nōmina',
  note: 'neuter: nominative, accusative and vocative are always alike; genitive plural -um',
  columns: SG_PL,
  rows: [
    { case: 'nom', forms: ['nōmen', 'nōmina'] },
    { case: 'gen', forms: ['nōminis', 'nōminum'] },
    { case: 'dat', forms: ['nōminī', 'nōminibus'] },
    { case: 'acc', forms: ['nōmen', 'nōmina'] },
    { case: 'abl', forms: ['nōmine', 'nōminibus'] },
    { case: 'voc', forms: ['nōmen', 'nōmina'] },
  ],
};

export const NOUN3I_MF: NominalTable = {
  kind: 'nominal',
  id: 'noun3i-mf',
  title: '3rd declension (i-stems) · cīvium',
  note: 'i-stems (cīvis, hostis, nāvis): ablative sg -ī, genitive plural -ium',
  columns: SG_PL,
  rows: [
    { case: 'nom', forms: ['cīvis', 'cīvēs'] },
    { case: 'gen', forms: ['cīvis', 'cīvium'] },
    { case: 'dat', forms: ['cīvī', 'cīvibus'] },
    { case: 'acc', forms: ['cīvem', 'cīvēs'] },
    { case: 'abl', forms: ['cīve', 'cīvibus'] },
    { case: 'voc', forms: ['cīvis', 'cīvēs'] },
  ],
};

export const NOUN3I_N: NominalTable = {
  kind: 'nominal',
  id: 'noun3i-n',
  title: '3rd declension (i-stems, neuter) · maria',
  note: 'neuter i-stems (mare, animal): genitive plural -ium',
  columns: SG_PL,
  rows: [
    { case: 'nom', forms: ['mare', 'maria'] },
    { case: 'gen', forms: ['maris', 'marium'] },
    { case: 'dat', forms: ['marī', 'maribus'] },
    { case: 'acc', forms: ['mare', 'maria'] },
    { case: 'abl', forms: ['marī', 'maribus'] },
    { case: 'voc', forms: ['mare', 'maria'] },
  ],
};

export const NOUN4_MF: NominalTable = {
  kind: 'nominal',
  id: 'noun4-mf',
  title: '4th declension · manūs',
  note: 'mostly masculine (manus, excursus); -ūs throughout the singular except dat/abl',
  columns: SG_PL,
  rows: [
    { case: 'nom', forms: ['manūs', 'manūs'] },
    { case: 'gen', forms: ['manūs', 'manuum'] },
    { case: 'dat', forms: ['manuī', 'manibus'] },
    { case: 'acc', forms: ['manum', 'manūs'] },
    { case: 'abl', forms: ['manū', 'manibus'] },
    { case: 'voc', forms: ['manūs', 'manūs'] },
  ],
};

export const NOUN4_N: NominalTable = {
  kind: 'nominal',
  id: 'noun4-n',
  title: '4th declension (neuter) · cornua',
  note: 'neuter: nominative, accusative and vocative are always alike',
  columns: SG_PL,
  rows: [
    { case: 'nom', forms: ['cornū', 'cornua'] },
    { case: 'gen', forms: ['cornūs', 'cornuum'] },
    { case: 'dat', forms: ['cornū', 'cornibus'] },
    { case: 'acc', forms: ['cornū', 'cornua'] },
    { case: 'abl', forms: ['cornū', 'cornibus'] },
    { case: 'voc', forms: ['cornū', 'cornua'] },
  ],
};

export const NOUN5: NominalTable = {
  kind: 'nominal',
  id: 'noun5',
  title: '5th declension · rēs',
  note: 'rēs and diēs have full plurals; most 5th-declension words (spēs) are singular-only',
  columns: SG_PL,
  rows: [
    { case: 'nom', forms: ['rēs', 'rēs'] },
    { case: 'gen', forms: ['reī', 'rērum'] },
    { case: 'dat', forms: ['reī', 'rēbus'] },
    { case: 'acc', forms: ['rem', 'rēs'] },
    { case: 'abl', forms: ['rē', 'rēbus'] },
    { case: 'voc', forms: ['rēs', 'rēs'] },
  ],
};
