import type { Mood, Person, Tense, Voice } from '@lego/shared';
import type { VerbCell, VerbRow, VerbSection, VerbTable } from '../types';

/**
 * Verb tables: the four conjugations (3rd with its iō-stem variant) plus
 * five irregulars (esse, posse, īre, ferre, velle). Sections group rows
 * by mood/voice; finite rows carry six person/number cells, imperative
 * rows carry the persons that exist, and infinitive/participle rows
 * carry a single form.
 *
 * Perfect-passive and participle forms are shown in the masculine
 * singular — the participle agrees with the subject in gender, number
 * and case.
 */

type Six = readonly [string, string, string, string, string, string];

const PERSONS: ReadonlyArray<{ person: Person; number: 'sg' | 'pl' }> = [
  { person: '1st', number: 'sg' },
  { person: '2nd', number: 'sg' },
  { person: '3rd', number: 'sg' },
  { person: '1st', number: 'pl' },
  { person: '2nd', number: 'pl' },
  { person: '3rd', number: 'pl' },
];

/** Six finite cells (1–3 sg, 1–3 pl). */
function six(forms: Six): VerbCell[] {
  return forms.map((form, i) => ({ form, person: PERSONS[i]!.person, number: PERSONS[i]!.number }));
}

/** A finite indicative/subjunctive row. */
function fin(tense: Tense, mood: 'ind' | 'subj', voice: Voice, label: string, forms: Six): VerbRow {
  return { tense, mood, voice, label, cells: six(forms) };
}

/** An imperative row; cells are (form | null, person, number) triples. */
function imper(
  tense: 'pres' | 'fut',
  voice: Voice,
  label: string,
  cells: ReadonlyArray<readonly [string | null, Person, 'sg' | 'pl']>,
): VerbRow {
  return {
    tense,
    mood: 'imperat',
    voice,
    label,
    cells: cells.map(([form, person, number]) => ({ form, person, number })),
  };
}

/** A one-form row (infinitive or participle). */
function one(tense: Tense, mood: Mood, voice: Voice, label: string, form: string): VerbRow {
  return { tense, mood, voice, label, cells: [{ form, person: null, number: null }] };
}

const PERF_PASS_NOTE =
  'perfect-passive forms are shown in the masculine singular — the participle agrees with the subject';

// ---------------------------------------------------------------------------
// 1st conjugation — amāre
// ---------------------------------------------------------------------------

export const VERB1: VerbTable = {
  kind: 'verbal',
  id: 'verb1',
  title: '1st conjugation · amāre',
  note: PERF_PASS_NOTE,
  sections: [
    {
      label: 'Indicative · active',
      rows: [
        fin('pres', 'ind', 'active', 'present', ['amō', 'amās', 'amat', 'amāmus', 'amātis', 'amant']),
        fin('imperf', 'ind', 'active', 'imperfect', ['amābam', 'amābās', 'amābat', 'amābāmus', 'amābātis', 'amābant']),
        fin('fut', 'ind', 'active', 'future', ['amābō', 'amābis', 'amabit', 'amābimus', 'amābitis', 'amābunt']),
        fin('perf', 'ind', 'active', 'perfect', ['amāvī', 'amāvistī', 'amāvit', 'amāvimus', 'amāvistis', 'amāvērunt']),
        fin('plup', 'ind', 'active', 'pluperfect', ['amāveram', 'amāverās', 'amāverat', 'amāverāmus', 'amāverātis', 'amāverant']),
        fin('futp', 'ind', 'active', 'future perfect', ['amāverō', 'amāveris', 'amāverit', 'amāverimus', 'amāveritis', 'amāverint']),
      ],
    },
    {
      label: 'Indicative · passive',
      rows: [
        fin('pres', 'ind', 'passive', 'present', ['amor', 'amāris', 'amātur', 'amāmur', 'amāminī', 'amantur']),
        fin('imperf', 'ind', 'passive', 'imperfect', ['amābar', 'amābāris', 'amābātur', 'amābāmur', 'amābāminī', 'amābantur']),
        fin('fut', 'ind', 'passive', 'future', ['amābor', 'amāberis', 'amābitur', 'amābimur', 'amābiminī', 'amābuntur']),
        fin('perf', 'ind', 'passive', 'perfect', ['amātus sum', 'amātus es', 'amātus est', 'amātī sumus', 'amātī estis', 'amātī sunt']),
        fin('plup', 'ind', 'passive', 'pluperfect', ['amātus eram', 'amātus erās', 'amātus erat', 'amātī erāmus', 'amātī erātis', 'amātī erant']),
        fin('futp', 'ind', 'passive', 'future perfect', ['amātus erō', 'amātus eris', 'amātus erit', 'amātī erimus', 'amātī eritis', 'amātī erunt']),
      ],
    },
    {
      label: 'Subjunctive · active',
      rows: [
        fin('pres', 'subj', 'active', 'present', ['amem', 'amēs', 'amet', 'amēmus', 'amētis', 'ament']),
        fin('imperf', 'subj', 'active', 'imperfect', ['amārem', 'amārēs', 'amāret', 'amārēmus', 'amārētis', 'amārent']),
        fin('perf', 'subj', 'active', 'perfect', ['amāverim', 'amāverīs', 'amāverit', 'amāverīmus', 'amāverītis', 'amāverint']),
        fin('plup', 'subj', 'active', 'pluperfect', ['amāvissem', 'amāvissēs', 'amāvisset', 'amāvissēmus', 'amāvissētis', 'amāvissent']),
      ],
    },
    {
      label: 'Subjunctive · passive',
      rows: [
        fin('pres', 'subj', 'passive', 'present', ['amer', 'amēris', 'amētur', 'amēmur', 'amēminī', 'amentur']),
        fin('imperf', 'subj', 'passive', 'imperfect', ['amārer', 'amārēris', 'amārētur', 'amārēmur', 'amārēminī', 'amārentur']),
        fin('perf', 'subj', 'passive', 'perfect', ['amātus sim', 'amātus sīs', 'amātus sit', 'amātī sīmus', 'amātī sītis', 'amātī sint']),
        fin('plup', 'subj', 'passive', 'pluperfect', ['amātus essem', 'amātus essēs', 'amātus esset', 'amātī essēmus', 'amātī essētis', 'amātī essent']),
      ],
    },
    {
      label: 'Imperative',
      rows: [
        imper('pres', 'active', 'present', [['amā', '2nd', 'sg'], ['amāte', '2nd', 'pl']]),
        imper('fut', 'active', 'future', [['amātō', '2nd', 'sg'], ['amātō', '3rd', 'sg'], ['amātōte', '2nd', 'pl'], ['amāntō', '3rd', 'pl']]),
        imper('pres', 'passive', 'present (passive)', [['amāre', '2nd', 'sg'], ['amāminī', '2nd', 'pl']]),
        imper('fut', 'passive', 'future (passive)', [['amātor', '2nd', 'sg'], ['amātor', '3rd', 'sg'], [null, '2nd', 'pl'], ['amāntor', '3rd', 'pl']]),
      ],
    },
    {
      label: 'Infinitive',
      rows: [
        one('pres', 'inf', 'active', 'present active', 'amāre'),
        one('pres', 'inf', 'passive', 'present passive', 'amārī'),
        one('perf', 'inf', 'active', 'perfect active', 'amāvisse'),
        one('perf', 'inf', 'passive', 'perfect passive', 'amātus esse'),
        one('fut', 'inf', 'active', 'future active', 'amātūrus esse'),
        one('fut', 'inf', 'passive', 'future passive', 'amātum īrī'),
      ],
    },
    {
      label: 'Participle',
      rows: [
        one('pres', 'part', 'active', 'present active', 'amāns'),
        one('perf', 'part', 'passive', 'perfect passive', 'amātus'),
        one('fut', 'part', 'active', 'future active', 'amātūrus'),
        one('fut', 'part', 'passive', 'future passive (gerundive)', 'amāndus'),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 2nd conjugation — monēre
// ---------------------------------------------------------------------------

export const VERB2: VerbTable = {
  kind: 'verbal',
  id: 'verb2',
  title: '2nd conjugation · monēre',
  note: PERF_PASS_NOTE,
  sections: [
    {
      label: 'Indicative · active',
      rows: [
        fin('pres', 'ind', 'active', 'present', ['moneō', 'monēs', 'monet', 'monēmus', 'monētis', 'monent']),
        fin('imperf', 'ind', 'active', 'imperfect', ['monēbam', 'monēbās', 'monēbat', 'monēbāmus', 'monēbātis', 'monēbant']),
        fin('fut', 'ind', 'active', 'future', ['monēbō', 'monēbis', 'monēbit', 'monēbimus', 'monēbitis', 'monēbunt']),
        fin('perf', 'ind', 'active', 'perfect', ['monuī', 'monuistī', 'monuit', 'monuimus', 'monuistis', 'monuērunt']),
        fin('plup', 'ind', 'active', 'pluperfect', ['monueram', 'monuerās', 'monuerat', 'monuerāmus', 'monuerātis', 'monuerant']),
        fin('futp', 'ind', 'active', 'future perfect', ['monuerō', 'monueris', 'monuerit', 'monuerimus', 'monueritis', 'monuerint']),
      ],
    },
    {
      label: 'Indicative · passive',
      rows: [
        fin('pres', 'ind', 'passive', 'present', ['moneor', 'monēris', 'monētur', 'monēmur', 'monēminī', 'monentur']),
        fin('imperf', 'ind', 'passive', 'imperfect', ['monēbar', 'monēbāris', 'monēbātur', 'monēbāmur', 'monēbāminī', 'monēbantur']),
        fin('fut', 'ind', 'passive', 'future', ['monēbor', 'monēberis', 'monēbitur', 'monēbimur', 'monēbiminī', 'monēbuntur']),
        fin('perf', 'ind', 'passive', 'perfect', ['monitus sum', 'monitus es', 'monitus est', 'monitī sumus', 'monitī estis', 'monitī sunt']),
        fin('plup', 'ind', 'passive', 'pluperfect', ['monitus eram', 'monitus erās', 'monitus erat', 'monitī erāmus', 'monitī erātis', 'monitī erant']),
        fin('futp', 'ind', 'passive', 'future perfect', ['monitus erō', 'monitus eris', 'monitus erit', 'monitī erimus', 'monitī eritis', 'monitī erunt']),
      ],
    },
    {
      label: 'Subjunctive · active',
      rows: [
        fin('pres', 'subj', 'active', 'present', ['moneam', 'moneās', 'moneat', 'moneāmus', 'moneātis', 'moneant']),
        fin('imperf', 'subj', 'active', 'imperfect', ['monērem', 'monērēs', 'monēret', 'monērēmus', 'monērētis', 'monērent']),
        fin('perf', 'subj', 'active', 'perfect', ['monuerim', 'monuerīs', 'monuerit', 'monuerīmus', 'monuerītis', 'monuerint']),
        fin('plup', 'subj', 'active', 'pluperfect', ['monuissem', 'monuissēs', 'monuisset', 'monuissēmus', 'monuissētis', 'monuissent']),
      ],
    },
    {
      label: 'Subjunctive · passive',
      rows: [
        fin('pres', 'subj', 'passive', 'present', ['monear', 'moneāris', 'moneātur', 'moneāmur', 'moneāminī', 'moneantur']),
        fin('imperf', 'subj', 'passive', 'imperfect', ['monērer', 'monērēris', 'monērētur', 'monērēmur', 'monērēminī', 'monērentur']),
        fin('perf', 'subj', 'passive', 'perfect', ['monitus sim', 'monitus sīs', 'monitus sit', 'monitī sīmus', 'monitī sītis', 'monitī sint']),
        fin('plup', 'subj', 'passive', 'pluperfect', ['monitus essem', 'monitus essēs', 'monitus esset', 'monitī essēmus', 'monitī essētis', 'monitī essent']),
      ],
    },
    {
      label: 'Imperative',
      rows: [
        imper('pres', 'active', 'present', [['monē', '2nd', 'sg'], ['monēte', '2nd', 'pl']]),
        imper('fut', 'active', 'future', [['monētō', '2nd', 'sg'], ['monētō', '3rd', 'sg'], ['monētōte', '2nd', 'pl'], ['monentō', '3rd', 'pl']]),
        imper('pres', 'passive', 'present (passive)', [['monēre', '2nd', 'sg'], ['monēminī', '2nd', 'pl']]),
        imper('fut', 'passive', 'future (passive)', [['monētor', '2nd', 'sg'], ['monētor', '3rd', 'sg'], [null, '2nd', 'pl'], ['monentor', '3rd', 'pl']]),
      ],
    },
    {
      label: 'Infinitive',
      rows: [
        one('pres', 'inf', 'active', 'present active', 'monēre'),
        one('pres', 'inf', 'passive', 'present passive', 'monērī'),
        one('perf', 'inf', 'active', 'perfect active', 'monuisse'),
        one('perf', 'inf', 'passive', 'perfect passive', 'monitus esse'),
        one('fut', 'inf', 'active', 'future active', 'monitūrus esse'),
        one('fut', 'inf', 'passive', 'future passive', 'monitum īrī'),
      ],
    },
    {
      label: 'Participle',
      rows: [
        one('pres', 'part', 'active', 'present active', 'monēns'),
        one('perf', 'part', 'passive', 'perfect passive', 'monitus'),
        one('fut', 'part', 'active', 'future active', 'monitūrus'),
        one('fut', 'part', 'passive', 'future passive (gerundive)', 'monendus'),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 3rd conjugation — rapere
// ---------------------------------------------------------------------------

export const VERB3: VerbTable = {
  kind: 'verbal',
  id: 'verb3',
  title: '3rd conjugation · rapere',
  note: PERF_PASS_NOTE,
  sections: [
    {
      label: 'Indicative · active',
      rows: [
        fin('pres', 'ind', 'active', 'present', ['rapiō', 'rapis', 'rapit', 'rapimus', 'rapitis', 'rapunt']),
        fin('imperf', 'ind', 'active', 'imperfect', ['rapēbam', 'rapēbās', 'rapēbat', 'rapēbāmus', 'rapēbātis', 'rapēbant']),
        fin('fut', 'ind', 'active', 'future', ['rapam', 'rapēs', 'rapet', 'rapēmus', 'rapētis', 'rapent']),
        fin('perf', 'ind', 'active', 'perfect', ['rapuī', 'rapuistī', 'rapuit', 'rapuimus', 'rapuistis', 'rapuērunt']),
        fin('plup', 'ind', 'active', 'pluperfect', ['rapueram', 'rapuerās', 'rapuerat', 'rapuerāmus', 'rapuerātis', 'rapuerant']),
        fin('futp', 'ind', 'active', 'future perfect', ['rapuerō', 'rapueris', 'rapuerit', 'rapuerimus', 'rapueritis', 'rapuerint']),
      ],
    },
    {
      label: 'Indicative · passive',
      rows: [
        fin('pres', 'ind', 'passive', 'present', ['rapior', 'rapēris', 'rapitur', 'rapimur', 'rapiminī', 'rapuntur']),
        fin('imperf', 'ind', 'passive', 'imperfect', ['rapēbar', 'rapēbāris', 'rapēbātur', 'rapēbāmur', 'rapēbāminī', 'rapēbantur']),
        fin('fut', 'ind', 'passive', 'future', ['rapar', 'rapēris', 'rapētur', 'rapēmur', 'rapiminī', 'rapentur']),
        fin('perf', 'ind', 'passive', 'perfect', ['raptus sum', 'raptus es', 'raptus est', 'raptī sumus', 'raptī estis', 'raptī sunt']),
        fin('plup', 'ind', 'passive', 'pluperfect', ['raptus eram', 'raptus erās', 'raptus erat', 'raptī erāmus', 'raptī erātis', 'raptī erant']),
        fin('futp', 'ind', 'passive', 'future perfect', ['raptus erō', 'raptus eris', 'raptus erit', 'raptī erimus', 'raptī eritis', 'raptī erunt']),
      ],
    },
    {
      label: 'Subjunctive · active',
      rows: [
        fin('pres', 'subj', 'active', 'present', ['rapam', 'rapās', 'rapat', 'rapāmus', 'rapātis', 'rapant']),
        fin('imperf', 'subj', 'active', 'imperfect', ['raperem', 'raperēs', 'raperet', 'raperēmus', 'raperētis', 'raperent']),
        fin('perf', 'subj', 'active', 'perfect', ['rapuerim', 'rapuerīs', 'rapuerit', 'rapuerīmus', 'rapuerītis', 'rapuerint']),
        fin('plup', 'subj', 'active', 'pluperfect', ['rapuissem', 'rapuissēs', 'rapuisset', 'rapuissēmus', 'rapuissētis', 'rapuissent']),
      ],
    },
    {
      label: 'Subjunctive · passive',
      rows: [
        fin('pres', 'subj', 'passive', 'present', ['rapar', 'rapāris', 'rapātur', 'rapāmur', 'rapāminī', 'rapantur']),
        fin('imperf', 'subj', 'passive', 'imperfect', ['raperer', 'raperēris', 'raperētur', 'raperēmur', 'raperēminī', 'raperentur']),
        fin('perf', 'subj', 'passive', 'perfect', ['raptus sim', 'raptus sīs', 'raptus sit', 'raptī sīmus', 'raptī sītis', 'raptī sint']),
        fin('plup', 'subj', 'passive', 'pluperfect', ['raptus essem', 'raptus essēs', 'raptus esset', 'raptī essēmus', 'raptī essētis', 'raptī essent']),
      ],
    },
    {
      label: 'Imperative',
      rows: [
        imper('pres', 'active', 'present', [['rape', '2nd', 'sg'], ['rapite', '2nd', 'pl']]),
        imper('fut', 'active', 'future', [['rapitō', '2nd', 'sg'], ['rapitō', '3rd', 'sg'], ['rapitōte', '2nd', 'pl'], ['rapuntō', '3rd', 'pl']]),
        imper('pres', 'passive', 'present (passive)', [['rapere', '2nd', 'sg'], ['rapiminī', '2nd', 'pl']]),
        imper('fut', 'passive', 'future (passive)', [['rapitor', '2nd', 'sg'], ['rapitor', '3rd', 'sg'], [null, '2nd', 'pl'], ['rapuntor', '3rd', 'pl']]),
      ],
    },
    {
      label: 'Infinitive',
      rows: [
        one('pres', 'inf', 'active', 'present active', 'rapere'),
        one('pres', 'inf', 'passive', 'present passive', 'rapī'),
        one('perf', 'inf', 'active', 'perfect active', 'rapuisse'),
        one('perf', 'inf', 'passive', 'perfect passive', 'raptus esse'),
        one('fut', 'inf', 'active', 'future active', 'raptūrus esse'),
        one('fut', 'inf', 'passive', 'future passive', 'raptum īrī'),
      ],
    },
    {
      label: 'Participle',
      rows: [
        one('pres', 'part', 'active', 'present active', 'rapēns'),
        one('perf', 'part', 'passive', 'perfect passive', 'raptus'),
        one('fut', 'part', 'active', 'future active', 'raptūrus'),
        one('fut', 'part', 'passive', 'future passive (gerundive)', 'rapendus'),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 3rd conjugation, iō-stem — capere
// ---------------------------------------------------------------------------

export const VERB3IO: VerbTable = {
  kind: 'verbal',
  id: 'verb3io',
  title: '3rd conjugation (iō-stem) · capere',
  note: PERF_PASS_NOTE,
  sections: [
    {
      label: 'Indicative · active',
      rows: [
        fin('pres', 'ind', 'active', 'present', ['capiō', 'capis', 'capit', 'capimus', 'capitis', 'capiunt']),
        fin('imperf', 'ind', 'active', 'imperfect', ['capiēbam', 'capiēbās', 'capiēbat', 'capiēbāmus', 'capiēbātis', 'capiēbant']),
        fin('fut', 'ind', 'active', 'future', ['capiam', 'capiēs', 'capiet', 'capiēmus', 'capiētis', 'capient']),
        fin('perf', 'ind', 'active', 'perfect', ['cēpī', 'cēpistī', 'cēpit', 'cēpimus', 'cēpistis', 'cēpērunt']),
        fin('plup', 'ind', 'active', 'pluperfect', ['cēperam', 'cēperās', 'cēperat', 'cēperāmus', 'cēperātis', 'cēperant']),
        fin('futp', 'ind', 'active', 'future perfect', ['cēperō', 'cēperis', 'cēperit', 'cēperimus', 'cēperitis', 'cēperint']),
      ],
    },
    {
      label: 'Indicative · passive',
      rows: [
        fin('pres', 'ind', 'passive', 'present', ['capior', 'capēris', 'capitur', 'capimur', 'capiminī', 'capiuntur']),
        fin('imperf', 'ind', 'passive', 'imperfect', ['capiēbar', 'capiēbāris', 'capiēbātur', 'capiēbāmur', 'capiēbāminī', 'capiēbantur']),
        fin('fut', 'ind', 'passive', 'future', ['capiar', 'capiēris', 'capiētur', 'capiēmur', 'capiēminī', 'capientur']),
        fin('perf', 'ind', 'passive', 'perfect', ['captus sum', 'captus es', 'captus est', 'captī sumus', 'captī estis', 'captī sunt']),
        fin('plup', 'ind', 'passive', 'pluperfect', ['captus eram', 'captus erās', 'captus erat', 'captī erāmus', 'captī erātis', 'captī erant']),
        fin('futp', 'ind', 'passive', 'future perfect', ['captus erō', 'captus eris', 'captus erit', 'captī erimus', 'captī eritis', 'captī erunt']),
      ],
    },
    {
      label: 'Subjunctive · active',
      rows: [
        fin('pres', 'subj', 'active', 'present', ['capiam', 'capiās', 'capiat', 'capiāmus', 'capiātis', 'capiant']),
        fin('imperf', 'subj', 'active', 'imperfect', ['caperem', 'caperēs', 'caperet', 'caperēmus', 'caperētis', 'caperent']),
        fin('perf', 'subj', 'active', 'perfect', ['cēperim', 'cēperīs', 'cēperit', 'cēperīmus', 'cēperītis', 'cēperint']),
        fin('plup', 'subj', 'active', 'pluperfect', ['cēpissem', 'cēpissēs', 'cēpisset', 'cēpissēmus', 'cēpissētis', 'cēpissent']),
      ],
    },
    {
      label: 'Subjunctive · passive',
      rows: [
        fin('pres', 'subj', 'passive', 'present', ['capiar', 'capiāris', 'capiātur', 'capiāmur', 'capiāminī', 'capiantur']),
        fin('imperf', 'subj', 'passive', 'imperfect', ['caperer', 'caperēris', 'caperētur', 'caperēmur', 'caperēminī', 'caperentur']),
        fin('perf', 'subj', 'passive', 'perfect', ['captus sim', 'captus sīs', 'captus sit', 'captī sīmus', 'captī sītis', 'captī sint']),
        fin('plup', 'subj', 'passive', 'pluperfect', ['captus essem', 'captus essēs', 'captus esset', 'captī essēmus', 'captī essētis', 'captī essent']),
      ],
    },
    {
      label: 'Imperative',
      rows: [
        imper('pres', 'active', 'present', [['cape', '2nd', 'sg'], ['capite', '2nd', 'pl']]),
        imper('fut', 'active', 'future', [['captō', '2nd', 'sg'], ['captō', '3rd', 'sg'], ['captōte', '2nd', 'pl'], ['capiuntō', '3rd', 'pl']]),
        imper('pres', 'passive', 'present (passive)', [['capere', '2nd', 'sg'], ['capiminī', '2nd', 'pl']]),
        imper('fut', 'passive', 'future (passive)', [['captor', '2nd', 'sg'], ['captor', '3rd', 'sg'], [null, '2nd', 'pl'], ['capiuntor', '3rd', 'pl']]),
      ],
    },
    {
      label: 'Infinitive',
      rows: [
        one('pres', 'inf', 'active', 'present active', 'capere'),
        one('pres', 'inf', 'passive', 'present passive', 'capī'),
        one('perf', 'inf', 'active', 'perfect active', 'cēpisse'),
        one('perf', 'inf', 'passive', 'perfect passive', 'captus esse'),
        one('fut', 'inf', 'active', 'future active', 'captūrus esse'),
        one('fut', 'inf', 'passive', 'future passive', 'captum īrī'),
      ],
    },
    {
      label: 'Participle',
      rows: [
        one('pres', 'part', 'active', 'present active', 'capiēns'),
        one('perf', 'part', 'passive', 'perfect passive', 'captus'),
        one('fut', 'part', 'active', 'future active', 'captūrus'),
        one('fut', 'part', 'passive', 'future passive (gerundive)', 'capiendus'),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 4th conjugation — audīre
// ---------------------------------------------------------------------------

export const VERB4: VerbTable = {
  kind: 'verbal',
  id: 'verb4',
  title: '4th conjugation · audīre',
  note: PERF_PASS_NOTE,
  sections: [
    {
      label: 'Indicative · active',
      rows: [
        fin('pres', 'ind', 'active', 'present', ['audiō', 'audīs', 'audit', 'audīmus', 'audītis', 'audiunt']),
        fin('imperf', 'ind', 'active', 'imperfect', ['audiēbam', 'audiēbās', 'audiēbat', 'audiēbāmus', 'audiēbātis', 'audiēbant']),
        fin('fut', 'ind', 'active', 'future', ['audiam', 'audiēs', 'audiet', 'audiēmus', 'audiētis', 'audient']),
        fin('perf', 'ind', 'active', 'perfect', ['audīvī', 'audīvistī', 'audīvit', 'audīvimus', 'audīvistis', 'audīvērunt']),
        fin('plup', 'ind', 'active', 'pluperfect', ['audīveram', 'audīverās', 'audīverat', 'audīverāmus', 'audīverātis', 'audīverant']),
        fin('futp', 'ind', 'active', 'future perfect', ['audīverō', 'audīveris', 'audīverit', 'audīverimus', 'audīveritis', 'audīverint']),
      ],
    },
    {
      label: 'Indicative · passive',
      rows: [
        fin('pres', 'ind', 'passive', 'present', ['audior', 'audīris', 'audītur', 'audīmur', 'audīminī', 'audiuntur']),
        fin('imperf', 'ind', 'passive', 'imperfect', ['audiēbar', 'audiēbāris', 'audiēbātur', 'audiēbāmur', 'audiēbāminī', 'audiēbantur']),
        fin('fut', 'ind', 'passive', 'future', ['audiar', 'audiēris', 'audiētur', 'audiēmur', 'audiēminī', 'audientur']),
        fin('perf', 'ind', 'passive', 'perfect', ['audītus sum', 'audītus es', 'audītus est', 'audītī sumus', 'audītī estis', 'audītī sunt']),
        fin('plup', 'ind', 'passive', 'pluperfect', ['audītus eram', 'audītus erās', 'audītus erat', 'audītī erāmus', 'audītī erātis', 'audītī erant']),
        fin('futp', 'ind', 'passive', 'future perfect', ['audītus erō', 'audītus eris', 'audītus erit', 'audītī erimus', 'audītī eritis', 'audītī erunt']),
      ],
    },
    {
      label: 'Subjunctive · active',
      rows: [
        fin('pres', 'subj', 'active', 'present', ['audiam', 'audiās', 'audiat', 'audiāmus', 'audiātis', 'audiant']),
        fin('imperf', 'subj', 'active', 'imperfect', ['audīrem', 'audīrēs', 'audīret', 'audīrēmus', 'audīrētis', 'audīrent']),
        fin('perf', 'subj', 'active', 'perfect', ['audīverim', 'audīverīs', 'audīverit', 'audīverīmus', 'audīverītis', 'audīverint']),
        fin('plup', 'subj', 'active', 'pluperfect', ['audīvissem', 'audīvissēs', 'audīvisset', 'audīvissēmus', 'audīvissētis', 'audīvissent']),
      ],
    },
    {
      label: 'Subjunctive · passive',
      rows: [
        fin('pres', 'subj', 'passive', 'present', ['audiar', 'audiāris', 'audiātur', 'audiāmur', 'audiāminī', 'audiantur']),
        fin('imperf', 'subj', 'passive', 'imperfect', ['audīrer', 'audīrēris', 'audīrētur', 'audīrēmur', 'audīrēminī', 'audīrentur']),
        fin('perf', 'subj', 'passive', 'perfect', ['audītus sim', 'audītus sīs', 'audītus sit', 'audītī sīmus', 'audītī sītis', 'audītī sint']),
        fin('plup', 'subj', 'passive', 'pluperfect', ['audītus essem', 'audītus essēs', 'audītus esset', 'audītī essēmus', 'audītī essētis', 'audītī essent']),
      ],
    },
    {
      label: 'Imperative',
      rows: [
        imper('pres', 'active', 'present', [['audī', '2nd', 'sg'], ['audīte', '2nd', 'pl']]),
        imper('fut', 'active', 'future', [['audītō', '2nd', 'sg'], ['audītō', '3rd', 'sg'], ['audītōte', '2nd', 'pl'], ['audiuntō', '3rd', 'pl']]),
        imper('pres', 'passive', 'present (passive)', [['audīre', '2nd', 'sg'], ['audīminī', '2nd', 'pl']]),
        imper('fut', 'passive', 'future (passive)', [['audītor', '2nd', 'sg'], ['audītor', '3rd', 'sg'], [null, '2nd', 'pl'], ['audiuntor', '3rd', 'pl']]),
      ],
    },
    {
      label: 'Infinitive',
      rows: [
        one('pres', 'inf', 'active', 'present active', 'audīre'),
        one('pres', 'inf', 'passive', 'present passive', 'audīrī'),
        one('perf', 'inf', 'active', 'perfect active', 'audīvisse'),
        one('perf', 'inf', 'passive', 'perfect passive', 'audītus esse'),
        one('fut', 'inf', 'active', 'future active', 'audītūrus esse'),
        one('fut', 'inf', 'passive', 'future passive', 'audītum īrī'),
      ],
    },
    {
      label: 'Participle',
      rows: [
        one('pres', 'part', 'active', 'present active', 'audiēns'),
        one('perf', 'part', 'passive', 'perfect passive', 'audītus'),
        one('fut', 'part', 'active', 'future active', 'audītūrus'),
        one('fut', 'part', 'passive', 'future passive (gerundive)', 'audiendus'),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Irregulars — esse, posse, īre, ferre, velle
// ---------------------------------------------------------------------------

export const ESSE: VerbTable = {
  kind: 'verbal',
  id: 'esse',
  title: 'irregular · esse',
  note: 'no passive; compounds (absum, adsum, prosum…) follow the same pattern',
  sections: [
    {
      label: 'Indicative · active',
      rows: [
        fin('pres', 'ind', 'active', 'present', ['sum', 'es', 'est', 'sumus', 'estis', 'sunt']),
        fin('imperf', 'ind', 'active', 'imperfect', ['eram', 'erās', 'erat', 'erāmus', 'erātis', 'erant']),
        fin('fut', 'ind', 'active', 'future', ['erō', 'eris', 'erit', 'erimus', 'eritis', 'erunt']),
        fin('perf', 'ind', 'active', 'perfect', ['fuī', 'fuistī', 'fuit', 'fuimus', 'fuistī', 'fuērunt']),
        fin('plup', 'ind', 'active', 'pluperfect', ['fueram', 'fuerās', 'fuerat', 'fuerāmus', 'fuerātis', 'fuerant']),
        fin('futp', 'ind', 'active', 'future perfect', ['fuerō', 'fueris', 'fuerit', 'fuerimus', 'fueritis', 'fuerint']),
      ],
    },
    {
      label: 'Subjunctive · active',
      rows: [
        fin('pres', 'subj', 'active', 'present', ['sim', 'sīs', 'sit', 'sīmus', 'sītis', 'sint']),
        fin('imperf', 'subj', 'active', 'imperfect', ['essem', 'essēs', 'esset', 'essēmus', 'essētis', 'essent']),
        fin('perf', 'subj', 'active', 'perfect', ['fuerim', 'fuerīs', 'fuerit', 'fuerīmus', 'fuerītis', 'fuerint']),
        fin('plup', 'subj', 'active', 'pluperfect', ['fuissem', 'fuissēs', 'fuisset', 'fuissēmus', 'fuissētis', 'fuissent']),
      ],
    },
    {
      label: 'Imperative',
      rows: [
        imper('pres', 'active', 'present', [['es', '2nd', 'sg'], ['este', '2nd', 'pl']]),
        imper('fut', 'active', 'future', [['estō', '2nd', 'sg'], ['estō', '3rd', 'sg'], ['estōte', '2nd', 'pl'], ['suntō', '3rd', 'pl']]),
      ],
    },
    {
      label: 'Infinitive',
      rows: [
        one('pres', 'inf', 'active', 'present active', 'esse'),
        one('perf', 'inf', 'active', 'perfect active', 'fuisse'),
        one('fut', 'inf', 'active', 'future active', 'futūrus esse'),
      ],
    },
    {
      label: 'Participle',
      rows: [one('fut', 'part', 'active', 'future active', 'futūrus')],
    },
  ],
};

export const POSSE: VerbTable = {
  kind: 'verbal',
  id: 'posse',
  title: 'irregular · posse',
  note: 'compound of sum; no passive, no imperative',
  sections: [
    {
      label: 'Indicative · active',
      rows: [
        fin('pres', 'ind', 'active', 'present', ['possum', 'potes', 'potest', 'possumus', 'potestis', 'possunt']),
        fin('imperf', 'ind', 'active', 'imperfect', ['poteram', 'poterās', 'poterat', 'poterāmus', 'poterātis', 'poterant']),
        fin('fut', 'ind', 'active', 'future', ['poterō', 'poteris', 'poterit', 'poterimus', 'poteritis', 'poterunt']),
        fin('perf', 'ind', 'active', 'perfect', ['potuī', 'potuistī', 'potuit', 'potuimus', 'potuistis', 'potuērunt']),
        fin('plup', 'ind', 'active', 'pluperfect', ['potueram', 'potuerās', 'potuerat', 'potuerāmus', 'potuerātis', 'potuerant']),
        fin('futp', 'ind', 'active', 'future perfect', ['potuerō', 'potueris', 'potuerit', 'potuerimus', 'potueritis', 'potuerint']),
      ],
    },
    {
      label: 'Subjunctive · active',
      rows: [
        fin('pres', 'subj', 'active', 'present', ['possim', 'possīs', 'possit', 'possīmus', 'possītis', 'possint']),
        fin('imperf', 'subj', 'active', 'imperfect', ['possem', 'possēs', 'possēt', 'possēmus', 'possētis', 'possent']),
        fin('perf', 'subj', 'active', 'perfect', ['potuerim', 'potuerīs', 'potuerit', 'potuerīmus', 'potuerītis', 'potuerint']),
        fin('plup', 'subj', 'active', 'pluperfect', ['potuissem', 'potuissēs', 'potuisset', 'potuissēmus', 'potuissētis', 'potuissent']),
      ],
    },
    {
      label: 'Infinitive',
      rows: [one('pres', 'inf', 'active', 'present active', 'posse')],
    },
    {
      label: 'Participle',
      rows: [one('pres', 'part', 'active', 'present active', 'potēns')],
    },
  ],
};

export const IRE: VerbTable = {
  kind: 'verbal',
  id: 'ire',
  title: 'irregular · īre',
  note: 'no passive (the rare passive forms are poetic); compounds (abeō, exeō, trānseō…) follow the same pattern',
  sections: [
    {
      label: 'Indicative · active',
      rows: [
        fin('pres', 'ind', 'active', 'present', ['eō', 'īs', 'it', 'īmus', 'ītis', 'eunt']),
        fin('imperf', 'ind', 'active', 'imperfect', ['ībam', 'ībās', 'ībat', 'ībāmus', 'ībātis', 'ībant']),
        fin('fut', 'ind', 'active', 'future', ['ībō', 'ībis', 'ībit', 'ībimus', 'ībitis', 'ībunt']),
        fin('perf', 'ind', 'active', 'perfect', ['iī', 'iistī', 'iit', 'iimus', 'iistis', 'iērunt']),
        fin('plup', 'ind', 'active', 'pluperfect', ['ieram', 'ierās', 'ierat', 'ierāmus', 'ierātis', 'ierant']),
        fin('futp', 'ind', 'active', 'future perfect', ['ierō', 'ieris', 'ierit', 'ierimus', 'ieritis', 'ierint']),
      ],
    },
    {
      label: 'Subjunctive · active',
      rows: [
        fin('pres', 'subj', 'active', 'present', ['eam', 'eās', 'eat', 'eāmus', 'eātis', 'eant']),
        fin('imperf', 'subj', 'active', 'imperfect', ['īrem', 'īrēs', 'īret', 'īrēmus', 'īrētis', 'īrent']),
        fin('perf', 'subj', 'active', 'perfect', ['ierim', 'ierīs', 'ierit', 'ierīmus', 'ierītis', 'ierint']),
        fin('plup', 'subj', 'active', 'pluperfect', ['iissem', 'iissēs', 'iisset', 'iissēmus', 'iissētis', 'iissent']),
      ],
    },
    {
      label: 'Imperative',
      rows: [
        imper('pres', 'active', 'present', [['ī', '2nd', 'sg'], ['īte', '2nd', 'pl']]),
        imper('fut', 'active', 'future', [['ītō', '2nd', 'sg'], ['ītō', '3rd', 'sg'], ['ītōte', '2nd', 'pl'], ['euntō', '3rd', 'pl']]),
      ],
    },
    {
      label: 'Infinitive',
      rows: [
        one('pres', 'inf', 'active', 'present active', 'īre'),
        one('perf', 'inf', 'active', 'perfect active', 'iisse'),
        one('fut', 'inf', 'active', 'future active', 'itūrus esse'),
      ],
    },
    {
      label: 'Participle',
      rows: [
        one('pres', 'part', 'active', 'present active', 'iēns'),
        one('fut', 'part', 'active', 'future active', 'itūrus'),
      ],
    },
  ],
};

export const FERRE: VerbTable = {
  kind: 'verbal',
  id: 'ferre',
  title: 'irregular · ferre',
  note: `${PERF_PASS_NOTE}; the perfect system uses tulī / lātus`,
  sections: [
    {
      label: 'Indicative · active',
      rows: [
        fin('pres', 'ind', 'active', 'present', ['ferō', 'fers', 'fert', 'ferimus', 'fertis', 'ferunt']),
        fin('imperf', 'ind', 'active', 'imperfect', ['ferēbam', 'ferēbās', 'ferēbat', 'ferēbāmus', 'ferēbātis', 'ferēbant']),
        fin('fut', 'ind', 'active', 'future', ['feram', 'ferēs', 'feret', 'ferēmus', 'ferētis', 'ferent']),
        fin('perf', 'ind', 'active', 'perfect', ['tulī', 'tulistī', 'tulit', 'tulimus', 'tulistis', 'tulērunt']),
        fin('plup', 'ind', 'active', 'pluperfect', ['tuleram', 'tulerās', 'tulerat', 'tulerāmus', 'tulerātis', 'tulerant']),
        fin('futp', 'ind', 'active', 'future perfect', ['tulerō', 'tuleris', 'tulerit', 'tulerimus', 'tuleritis', 'tulerint']),
      ],
    },
    {
      label: 'Indicative · passive',
      rows: [
        fin('pres', 'ind', 'passive', 'present', ['feror', 'ferris', 'fertur', 'ferimur', 'feriminī', 'feruntur']),
        fin('imperf', 'ind', 'passive', 'imperfect', ['ferēbar', 'ferēbāris', 'ferēbātur', 'ferēbāmur', 'ferēbāminī', 'ferēbantur']),
        fin('fut', 'ind', 'passive', 'future', ['ferar', 'ferēris', 'ferētur', 'ferēmur', 'ferēminī', 'ferentur']),
        fin('perf', 'ind', 'passive', 'perfect', ['lātus sum', 'lātus es', 'lātus est', 'lātī sumus', 'lātī estis', 'lātī sunt']),
        fin('plup', 'ind', 'passive', 'pluperfect', ['lātus eram', 'lātus erās', 'lātus erat', 'lātī erāmus', 'lātī erātis', 'lātī erant']),
        fin('futp', 'ind', 'passive', 'future perfect', ['lātus erō', 'lātus eris', 'lātus erit', 'lātī erimus', 'lātī eritis', 'lātī erunt']),
      ],
    },
    {
      label: 'Subjunctive · active',
      rows: [
        fin('pres', 'subj', 'active', 'present', ['feram', 'ferās', 'ferat', 'ferāmus', 'ferātis', 'ferant']),
        fin('imperf', 'subj', 'active', 'imperfect', ['ferrem', 'ferrēs', 'ferret', 'ferrēmus', 'ferrētis', 'ferrent']),
        fin('perf', 'subj', 'active', 'perfect', ['tulerim', 'tulerīs', 'tulerit', 'tulerīmus', 'tulerītis', 'tulerint']),
        fin('plup', 'subj', 'active', 'pluperfect', ['tulissem', 'tulissēs', 'tulisset', 'tulissēmus', 'tulissētis', 'tulissent']),
      ],
    },
    {
      label: 'Subjunctive · passive',
      rows: [
        fin('pres', 'subj', 'passive', 'present', ['ferar', 'ferāris', 'ferātur', 'ferāmur', 'ferāminī', 'ferantur']),
        fin('imperf', 'subj', 'passive', 'imperfect', ['ferrer', 'ferrēris', 'ferrētur', 'ferrēmur', 'ferrēminī', 'ferrēntur']),
        fin('perf', 'subj', 'passive', 'perfect', ['lātus sim', 'lātus sīs', 'lātus sit', 'lātī sīmus', 'lātī sītis', 'lātī sint']),
        fin('plup', 'subj', 'passive', 'pluperfect', ['lātus essem', 'lātus essēs', 'lātus esset', 'lātī essēmus', 'lātī essētis', 'lātī essent']),
      ],
    },
    {
      label: 'Imperative',
      rows: [
        imper('pres', 'active', 'present', [['fer', '2nd', 'sg'], ['ferte', '2nd', 'pl']]),
        imper('fut', 'active', 'future', [['fertō', '2nd', 'sg'], ['fertō', '3rd', 'sg'], ['fertōte', '2nd', 'pl'], ['feruntō', '3rd', 'pl']]),
        imper('pres', 'passive', 'present (passive)', [['ferre', '2nd', 'sg'], ['feriminī', '2nd', 'pl']]),
        imper('fut', 'passive', 'future (passive)', [['fertor', '2nd', 'sg'], ['fertor', '3rd', 'sg'], [null, '2nd', 'pl'], ['feruntor', '3rd', 'pl']]),
      ],
    },
    {
      label: 'Infinitive',
      rows: [
        one('pres', 'inf', 'active', 'present active', 'ferre'),
        one('pres', 'inf', 'passive', 'present passive', 'ferrī'),
        one('perf', 'inf', 'active', 'perfect active', 'tulisse'),
        one('perf', 'inf', 'passive', 'perfect passive', 'lātus esse'),
        one('fut', 'inf', 'active', 'future active', 'lātūrus esse'),
        one('fut', 'inf', 'passive', 'future passive', 'lātum īrī'),
      ],
    },
    {
      label: 'Participle',
      rows: [
        one('pres', 'part', 'active', 'present active', 'ferēns'),
        one('perf', 'part', 'passive', 'perfect passive', 'lātus'),
        one('fut', 'part', 'active', 'future active', 'lātūrus'),
        one('fut', 'part', 'passive', 'future passive (gerundive)', 'ferendus'),
      ],
    },
  ],
};

export const VOLO: VerbTable = {
  kind: 'verbal',
  id: 'volo',
  title: 'irregular · velle',
  note: 'no passive, no imperative; nōlle and mālle follow the same pattern with their own stems',
  sections: [
    {
      label: 'Indicative · active',
      rows: [
        fin('pres', 'ind', 'active', 'present', ['volō', 'vīs', 'vult', 'volumus', 'vultis', 'volunt']),
        fin('imperf', 'ind', 'active', 'imperfect', ['volēbam', 'volēbās', 'volēbat', 'volēbāmus', 'volēbātis', 'volēbant']),
        fin('fut', 'ind', 'active', 'future', ['volam', 'volēs', 'volet', 'volēmus', 'volētis', 'volent']),
        fin('perf', 'ind', 'active', 'perfect', ['voluī', 'voluistī', 'voluit', 'voluimus', 'voluistis', 'voluērunt']),
        fin('plup', 'ind', 'active', 'pluperfect', ['volueram', 'voluerās', 'voluerat', 'voluerāmus', 'voluerātis', 'voluerant']),
        fin('futp', 'ind', 'active', 'future perfect', ['voluerō', 'volueris', 'voluerit', 'voluerimus', 'volueritis', 'voluerint']),
      ],
    },
    {
      label: 'Subjunctive · active',
      rows: [
        fin('pres', 'subj', 'active', 'present', ['velim', 'velīs', 'velīt', 'velīmus', 'velītis', 'velīnt']),
        fin('imperf', 'subj', 'active', 'imperfect', ['vellem', 'vellēs', 'vellet', 'vellēmus', 'vellētis', 'vellent']),
        fin('perf', 'subj', 'active', 'perfect', ['voluerim', 'voluerīs', 'voluerit', 'voluerīmus', 'voluerītis', 'voluerint']),
        fin('plup', 'subj', 'active', 'pluperfect', ['voluissem', 'voluissēs', 'voluisset', 'voluissēmus', 'voluissētis', 'voluissent']),
      ],
    },
    {
      label: 'Infinitive',
      rows: [
        one('pres', 'inf', 'active', 'present active', 'velle'),
        one('perf', 'inf', 'active', 'perfect active', 'voluisse'),
      ],
    },
    {
      label: 'Participle',
      rows: [one('pres', 'part', 'active', 'present active', 'volēns')],
    },
  ],
};
