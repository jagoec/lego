import type { NominalColumn, NominalTable } from '../types';

/**
 * Pronoun paradigms. Personal pronouns have no gender split (columns are
 * sg/pl); the demonstrative/relative pronouns split by gender; sē has no
 * nominative; quis is singular-only in practice.
 */

const SG_PL: ReadonlyArray<NominalColumn> = [
  { number: 'sg', gender: null },
  { number: 'pl', gender: null },
];

const MFN_SG_PL: ReadonlyArray<NominalColumn> = [
  { number: 'sg', gender: 'masc' },
  { number: 'sg', gender: 'fem' },
  { number: 'sg', gender: 'neut' },
  { number: 'pl', gender: 'masc' },
  { number: 'pl', gender: 'fem' },
  { number: 'pl', gender: 'neut' },
];

export const PRON_EGO: NominalTable = {
  kind: 'nominal',
  id: 'pron-ego',
  title: 'personal pronoun · ego, tū',
  note: 'genitive nostrum/vestrum is the objective form ("of us"); nostrī/vestrī the subjective',
  columns: SG_PL,
  rows: [
    { case: 'nom', forms: ['ego', 'nōs'] },
    { case: 'gen', forms: ['meī', 'nostrum/nostrī'] },
    { case: 'dat', forms: ['mihi', 'nōbīs'] },
    { case: 'acc', forms: ['mē', 'nōs'] },
    { case: 'abl', forms: ['mē', 'nōbīs'] },
    { case: 'voc', forms: [null, null] },
  ],
};

export const PRON_TU: NominalTable = {
  kind: 'nominal',
  id: 'pron-tu',
  title: 'personal pronoun · tū, vōs',
  columns: SG_PL,
  rows: [
    { case: 'nom', forms: ['tū', 'vōs'] },
    { case: 'gen', forms: ['tuī', 'vestrum/vestrī'] },
    { case: 'dat', forms: ['tibi', 'vōbīs'] },
    { case: 'acc', forms: ['tē', 'vōs'] },
    { case: 'abl', forms: ['tē', 'vōbīs'] },
    { case: 'voc', forms: [null, null] },
  ],
};

export const PRON_IS: NominalTable = {
  kind: 'nominal',
  id: 'pron-is',
  title: 'pronoun · is, ea, id',
  note: 'idem (eādem, idem) declines identically (gen eōrundem)',
  columns: MFN_SG_PL,
  rows: [
    { case: 'nom', forms: ['is', 'ea', 'id', 'eī', 'eae', 'ea'] },
    { case: 'gen', forms: ['eius', 'eius', 'eius', 'eōrum', 'eārum', 'eōrum'] },
    { case: 'dat', forms: ['eī', 'eī', 'eī', 'eīs', 'eīs', 'eīs'] },
    { case: 'acc', forms: ['eum', 'eam', 'id', 'eōs', 'eās', 'ea'] },
    { case: 'abl', forms: ['eō', 'eā', 'eō', 'eīs', 'eīs', 'eīs'] },
    { case: 'voc', forms: [null, null, null, null, null, null] },
  ],
};

export const PRON_HIC: NominalTable = {
  kind: 'nominal',
  id: 'pron-hic',
  title: 'pronoun · hic, haec, hoc',
  note: 'the -c is an enclitic particle; it drops before endings beginning with s-',
  columns: MFN_SG_PL,
  rows: [
    { case: 'nom', forms: ['hic', 'haec', 'hoc', 'hī', 'hae', 'haec'] },
    { case: 'gen', forms: ['huius', 'huius', 'huius', 'hōrum', 'hārum', 'hōrum'] },
    { case: 'dat', forms: ['huic', 'huic', 'huic', 'hīs', 'hīs', 'hīs'] },
    { case: 'acc', forms: ['hunc', 'hanc', 'hoc', 'hōs', 'hās', 'haec'] },
    { case: 'abl', forms: ['hōc', 'hāc', 'hōc', 'hīs', 'hīs', 'hīs'] },
    { case: 'voc', forms: [null, null, null, null, null, null] },
  ],
};

export const PRON_ILLE: NominalTable = {
  kind: 'nominal',
  id: 'pron-ille',
  title: 'pronoun · ille, illa, illud',
  note: 'illīc (illī-ce) is an emphatic form of ille with the same pattern',
  columns: MFN_SG_PL,
  rows: [
    { case: 'nom', forms: ['ille', 'illa', 'illud', 'illī', 'illae', 'illa'] },
    { case: 'gen', forms: ['illīus', 'illīus', 'illīus', 'illōrum', 'illārum', 'illōrum'] },
    { case: 'dat', forms: ['illī', 'illī', 'illī', 'illīs', 'illīs', 'illīs'] },
    { case: 'acc', forms: ['illum', 'illam', 'illud', 'illōs', 'illās', 'illa'] },
    { case: 'abl', forms: ['illō', 'illā', 'illō', 'illīs', 'illīs', 'illīs'] },
    { case: 'voc', forms: [null, null, null, null, null, null] },
  ],
};

export const PRON_ISTE: NominalTable = {
  kind: 'nominal',
  id: 'pron-iste',
  title: 'pronoun · iste, ista, istud',
  columns: MFN_SG_PL,
  rows: [
    { case: 'nom', forms: ['iste', 'ista', 'istud', 'istī', 'istae', 'ista'] },
    { case: 'gen', forms: ['istīus', 'istīus', 'istīus', 'istōrum', 'istārum', 'istōrum'] },
    { case: 'dat', forms: ['istī', 'istī', 'istī', 'istīs', 'istīs', 'istīs'] },
    { case: 'acc', forms: ['istum', 'istam', 'istud', 'istōs', 'istās', 'ista'] },
    { case: 'abl', forms: ['istō', 'istā', 'istō', 'istīs', 'istīs', 'istīs'] },
    { case: 'voc', forms: [null, null, null, null, null, null] },
  ],
};

export const PRON_IPSE: NominalTable = {
  kind: 'nominal',
  id: 'pron-ipse',
  title: 'pronoun · ipse, ipsa, ipsum',
  columns: MFN_SG_PL,
  rows: [
    { case: 'nom', forms: ['ipse', 'ipsa', 'ipsum', 'ipsī', 'ipsae', 'ipsa'] },
    { case: 'gen', forms: ['ipsīus', 'ipsīus', 'ipsīus', 'ipsōrum', 'ipsārum', 'ipsōrum'] },
    { case: 'dat', forms: ['ipsī', 'ipsī', 'ipsī', 'ipsīs', 'ipsīs', 'ipsīs'] },
    { case: 'acc', forms: ['ipsum', 'ipsam', 'ipsum', 'ipsōs', 'ipsās', 'ipsa'] },
    { case: 'abl', forms: ['ipsō', 'ipsā', 'ipsō', 'ipsīs', 'ipsīs', 'ipsīs'] },
    { case: 'voc', forms: [null, null, null, null, null, null] },
  ],
};

export const PRON_QUI: NominalTable = {
  kind: 'nominal',
  id: 'pron-qui',
  title: 'relative pronoun · quī, quae, quod',
  note: 'relative pronoun; quīcumque and (ali)quī decline the same way',
  columns: MFN_SG_PL,
  rows: [
    { case: 'nom', forms: ['quī', 'quae', 'quod', 'quī', 'quae', 'quae'] },
    { case: 'gen', forms: ['cuius', 'cuius', 'cuius', 'quōrum', 'quārum', 'quōrum'] },
    { case: 'dat', forms: ['cui', 'cui', 'cui', 'quibus', 'quibus', 'quibus'] },
    { case: 'acc', forms: ['quem', 'quam', 'quod', 'quōs', 'quās', 'quae'] },
    { case: 'abl', forms: ['quō', 'quā', 'quō', 'quibus', 'quibus', 'quibus'] },
    { case: 'voc', forms: [null, null, null, null, null, null] },
  ],
};

export const PRON_SE: NominalTable = {
  kind: 'nominal',
  id: 'pron-se',
  title: 'reflexive pronoun · sē, suī',
  note: 'reflexive: no nominative; sē is both singular and plural',
  columns: SG_PL,
  rows: [
    { case: 'nom', forms: [null, null] },
    { case: 'gen', forms: ['suī', 'suum'] },
    { case: 'dat', forms: ['sibi', 'sibi'] },
    { case: 'acc', forms: ['sē', 'sē'] },
    { case: 'abl', forms: ['sē', 'sē'] },
    { case: 'voc', forms: [null, null] },
  ],
};

export const PRON_QUIS: NominalTable = {
  kind: 'nominal',
  id: 'pron-quis',
  title: 'interrogative pronoun · quis? quid?',
  note: 'singular in practice; quisquam follows this pattern',
  columns: [
    { number: 'sg', gender: 'masc' },
    { number: 'sg', gender: 'neut' },
  ],
  rows: [
    { case: 'nom', forms: ['quis', 'quid'] },
    { case: 'gen', forms: ['cuius', 'cuius'] },
    { case: 'dat', forms: ['cui', 'cui'] },
    { case: 'acc', forms: ['quem', 'quid'] },
    { case: 'abl', forms: ['quō', 'quō'] },
    { case: 'voc', forms: [null, null] },
  ],
};
