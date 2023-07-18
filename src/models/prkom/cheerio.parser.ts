import * as cheerio from 'cheerio';
import { parseTable } from '@joshuaavalon/cheerio-table-parser';
import * as _ from 'lodash';
import * as css from 'css';
import {
  FormTrainingType,
  LevelTrainingType,
  AbiturientInfoStateType,
  IncomingsLink,
  IncomingsPageInfo,
  IncomingsPageOriginalInfo,
  AbiturientInfo,
  AbiturientInfo_Base,
  AbiturientInfo_Bachelor,
  AbiturientInfo_Magister,
} from '@my-interfaces';

export const parseMainIncomingsList = (html: string) => {
  const $ = cheerio.load(html);

  // level training files
  const incomings: IncomingsLink[] = [];

  const levelTrainingLabels = $('body > div.listab > label');
  for (const levelLabelEl of levelTrainingLabels) {
    const $levelLabel = $(levelLabelEl);

    const levelId = $levelLabel.attr('for');
    const levelFullName = $levelLabel.text().trim();
    const [levelName, levelType] = levelFullName.split('. ');

    const specialties: IncomingsLink['specialties'] = [];
    const levelSpecialtyLabels = $($levelLabel.next().get(0)).find('label');
    for (const specLabelEl of levelSpecialtyLabels) {
      const $specLabel = $(specLabelEl);

      const specialtyId = $specLabel.attr('for');
      const specialtyFullName = $specLabel.text().trim();
      const [specialtyCode, ...restWords] = specialtyFullName.split(' ');
      const specialtyName = restWords.join(' ');

      const specialtyLinks = $($specLabel.next().get(0)).find('a');
      const files: {
        name: string;
        filename: string;
      }[] = [];
      for (const linkEl of specialtyLinks) {
        //
        const $link = $(linkEl);

        const linkName = $link.text().trim();
        const linkHref = $link.attr('href');

        files.push({
          name: linkName,
          filename: linkHref,
        });
      }

      specialties.push({
        id: specialtyId,
        code: specialtyCode,
        name: specialtyName,
        fullName: specialtyFullName,
        files,
      });
    }

    incomings.push({
      id: levelId,
      name: levelName,
      fullName: levelFullName,
      levelType,
      specialties,
    });
  }

  return incomings;
};

const findCssRules = (style: string, property: string, value: string) => {
  const { stylesheet } = css.parse(style);
  const rules = stylesheet.rules
    .map(
      (rule: css.Rule) =>
        rule.type === 'rule' &&
        'declarations' in rule &&
        rule.declarations.find(
          (declaration) =>
            'value' in declaration &&
            declaration.property === property &&
            declaration.value === value,
        ) &&
        rule,
    )
    .filter(Boolean);

  return rules;
};

type ParsedTableType = {
  isGreen: boolean;
  isRed: boolean;
  content: string;
};
export const parseIncomingsInfo = async (html: string) => {
  const $ = cheerio.load(html);

  if (!$('body > table > tbody').get(0)) {
    return null;
  }

  let greenSelectors: string[] = [];
  let redSelectors: string[] = [];
  for (const el of $('style')) {
    const css = $(el).text();

    const greenRules = findCssRules(css, 'background-color', '#90ee90');
    for (const greenRule of greenRules.filter((e) => e.type === 'rule')) {
      let [selector] = greenRule.selectors;
      if (selector) {
        greenSelectors.push(selector.split('.').slice(-1)[0]);
      }
    }

    const redRules = findCssRules(css, 'color', '#a0522d');
    for (const redRule of redRules.filter((e) => e.type === 'rule')) {
      let [selector] = redRule.selectors;
      if (selector) {
        redSelectors.push(selector.split('.').slice(-1)[0]);
      }
    }

    // if (greenSelectors.length > 0 && redSelectorsgreenSelectors.length > 0) {
    //   break;
    // }
  }

  // // to delete extra columns
  // $('body > table > tbody td[colspan=12]').removeAttr('colspan');

  let tbodyData = parseTable($('body > table > tbody').get(0), {
    parser(element) {
      const content = $(element).text().trim();
      const isGreen =
        greenSelectors.some((e) => $(element).hasClass(e)) || false;
      const isRed = redSelectors.some((e) => $(element).hasClass(e)) || false;
      // const classes = $(element).attr('class');
      return (content && /* classes && */ {
        isGreen,
        isRed,
        content,
        // classes,
      }) as ParsedTableType;
    },
  });

  if (tbodyData.length === 0) return null;

  let [
    ,
    ,
    // Дата формирования - 07.07.2022. Время формирования - 15:00:00.
    [{ content: buildDate }],
    // Приемная кампания- Приемная кампания 222 от 31.03.2022 14:06:34
    [{ content: prkomDate }],
    // Конкурсная группа - Управление по программированию
    [{ content: competitionGroupName }],
    // Форма обучения - Очная
    [{ content: formTraining }],
    // Уровень подготовки - Магистр
    [{ content: levelTraining }],
    // УГС/Направление подготовки/специальность - 27.04.04 Управление в технических системах
    [{ content: directionTraining }],
    // Основание поступления - Бюджетная основа
    [{ content: basisAdmission }],
    // Источник финансирования - Федеральный бюджет
    [{ content: sourceFunding }],
    // Всего мест: 9. Зачислено: 0. К зачислению: 9.
    [{ content: numbersInfo }],
  ] = tbodyData;

  // ! hardcode. or smart get from table
  tbodyData.splice(0, 12);

  const originalInfo: IncomingsPageOriginalInfo = {
    buildDate,
    prkomDate,
    competitionGroupName,
    formTraining,
    levelTraining,
    directionTraining,
    basisAdmission,
    sourceFunding,
    numbersInfo,
  };

  const info: IncomingsPageInfo = {
    buildDate: (({ DD, MM, YYYY, time } = {}) =>
      !time ? null : new Date(`${YYYY}.${MM}.${DD} ${time}`))(
      buildDate.match(
        /.* - (?<DD>[0-9]{2})\.(?<MM>[0-9]{2})\.(?<YYYY>[0-9]{4})\. .* - (?<time>[0-9:]+).$/i,
      )?.groups,
    ),
    prkom: (({ number, DD, MM, YYYY, time } = {}) =>
      !number && !time
        ? null
        : {
            number: Number(number),
            date: new Date(`${YYYY}.${MM}.${DD} ${time}`),
          })(
      prkomDate.match(
        /.* ?- .* ? (?<number>[0-9]{1,4}) от (?<DD>[0-9]{2})\.(?<MM>[0-9]{2})\.(?<YYYY>[0-9]{4}) (?<time>[0-9:]+)$/i,
      )?.groups,
    ),
    competitionGroupName: (({ name } = {}) => name || null)(
      competitionGroupName.match(/(?![^-]+)- (?<name>.*)/i)?.groups,
    ),
    formTraining: (({ type } = {}) => {
      switch (type.toLocaleLowerCase()) {
        case 'очная':
          return FormTrainingType.FullTime;
        case 'заочная':
          return FormTrainingType.Extramural;
        case 'очно-заочная':
          return FormTrainingType.PartTime;
        default:
          return FormTrainingType.Unknown;
      }
    })(formTraining.match(/(?![^-]+)- (?<type>.*)/i)?.groups),
    levelTraining: (({ type } = {}) => {
      let str = type.toLocaleLowerCase();
      switch (true) {
        case str.startsWith('бакалавриат'):
          return LevelTrainingType.Bachelor;
        case str.startsWith('специалитет'):
          return LevelTrainingType.Specialty;
        case str.startsWith('магистратура'):
          return LevelTrainingType.Magister;
        case str.startsWith('аспирантура'):
          return LevelTrainingType.Postgraduate;
        default:
          return LevelTrainingType.Unknown;
      }
    })(levelTraining.match(/(?![^-]+)- (?<type>.*)/i)?.groups),
    directionTraining: (({ code, name } = {}) =>
      !name ? null : { code, name })(
      directionTraining.match(/(?![^-]+)- (?<code>[0-9\.]+) (?<name>.*)/i)
        ?.groups,
    ),
    basisAdmission: (({ name } = {}) => name || null)(
      basisAdmission.match(/(?![^-]+)- (?<name>.*)/i)?.groups,
    ),
    sourceFunding: (({ name } = {}) => name || null)(
      sourceFunding.match(/(?![^-]+)- (?<name>.*)/i)?.groups,
    ),
    numbersInfo: ((nums) =>
      !nums
        ? null
        : Object.keys(nums).reduce(
            (p, c) => ({ ...p, [c]: Number(nums[c]) }),
            {} as IncomingsPageInfo['numbersInfo'],
          ))(
      numbersInfo.match(
        /.*: (?<total>[0-9]{1,4})\..*: (?<enrolled>[0-9]{1,4})\..*: (?<toenroll>[0-9]{1,4})\.?$/i,
      )?.groups,
    ),
  };

  const [titles] = tbodyData.splice(0, 1);
  if (titles[1].content !== 'Уникальный код') {
    console.warn('Failed to parse table #2');
  }

  let listApplicants: AbiturientInfo[] = [];
  switch (info.levelTraining) {
    case LevelTrainingType.Bachelor:
    case LevelTrainingType.Specialty:
      listApplicants = parseBachelor(tbodyData, titles);
      break;
    case LevelTrainingType.Magister:
    case LevelTrainingType.Postgraduate:
      listApplicants = parseMagister(tbodyData, titles);
      break;
  }

  const preparedTitles = titles
    .map((e) => e.content?.trim().replace(/\s/g, ' '))
    .filter(Boolean);

  return {
    originalInfo,
    info,
    list: listApplicants,
    titles: preparedTitles,
  };
};

const numOrNul = (val: string) => (!isNaN(Number(val)) ? Number(val) : null);

const prepareType = (val: string, key?: keyof AbiturientInfo) => {
  switch (key) {
    // * Number or null
    case 'position':
    case 'totalScore':
    case 'scoreSubjectsSum':
    case 'scoreCompetitive':
    case 'priority':
    case 'priorityHight':
      return numOrNul(val);
    // * Bool
    case 'preemptiveRight':
    case 'originalInUniversity':
    case 'originalFromEGPU':
      return Boolean(val);
    // * Enum
    case 'state':
      return ((content) =>
        content === 'Подано'.toLocaleLowerCase()
          ? AbiturientInfoStateType.Submitted
          : content === 'Зачислен'.toLocaleLowerCase()
          ? AbiturientInfoStateType.Enrolled
          : AbiturientInfoStateType.Unknown)(val.toLocaleLowerCase());
    // * Strings
    case 'uid':
    default:
      return val;
  }
};

const parseBachelor = (
  tbodyData: ParsedTableType[][],
  titles: ParsedTableType[],
) => {
  const listApplicants: AbiturientInfo_Bachelor[] = [];

  const baseIndexes = parseBaseTitleIndexes(titles);
  const subjectsCount =
    baseIndexes.scoreCompetitive - baseIndexes.scoreSubjectsSum - 1;

  for (const data of tbodyData) {
    const getData = (i: number, key?: keyof AbiturientInfo) =>
      key ? (prepareType(data[i]?.content, key) as any) : data[i]?.content;

    listApplicants.push({
      isGreen: data[0].isGreen,
      isRed: data[0].isRed,

      ...(Object.fromEntries(
        Object.entries(baseIndexes).map(
          ([key, i]: [keyof AbiturientInfo, number]) => [key, getData(i, key)],
        ),
      ) as AbiturientInfo_Base),

      scoreSubjects: new Array(subjectsCount > 0 ? subjectsCount : 0)
        .fill(0)
        .map((_e, i) => [
          numOrNul(getData(baseIndexes.scoreSubjectsSum + i + 1)),
          titles[baseIndexes.scoreSubjectsSum + i + 1]?.content,
        ]),
    });
  }
  return listApplicants;
};

const parseMagister = (
  tbodyData: ParsedTableType[][],
  titles: ParsedTableType[],
) => {
  const listApplicants: AbiturientInfo_Magister[] = [];

  const findIndex = makeFindIndex(titles);
  const baseIndexes = parseBaseTitleIndexes(titles);

  for (const data of tbodyData) {
    const getData = (i: number, key?: keyof AbiturientInfo) =>
      key ? (prepareType(data[i]?.content, key) as any) : data[i]?.content;

    listApplicants.push({
      isGreen: data[0].isGreen,
      isRed: data[0].isRed,

      ...(Object.fromEntries(
        Object.entries(baseIndexes).map(
          ([key, i]: [keyof AbiturientInfo, number]) => [key, getData(i, key)],
        ),
      ) as AbiturientInfo_Base),

      scoreExam: findIndex('Вступительное испытание'),
    });
  }
  return listApplicants;
};

const makeFindIndex = (titles: ParsedTableType[]) => {
  const preparedTitles = titles
    .map((e) => e.content?.toLocaleLowerCase().trim().replace(/\s/g, '_'))
    .filter(Boolean);

  return (str: string, strict = false) => {
    // fix differnet Windows-1252 & UTF-8 spaces
    str = str.replace(/\s/g, '_');
    return ((e) => (e === -1 ? null : e))(
      preparedTitles.findIndex(
        (e) =>
          (!strict && e.startsWith(str.toLocaleLowerCase())) ||
          e === str.toLocaleLowerCase(),
      ),
    );
  };
};

const parseBaseTitleIndexes = (titles: ParsedTableType[]) => {
  const findIndex = makeFindIndex(titles);

  const indexes: Record<
    keyof Omit<AbiturientInfo_Base, 'isRed' | 'isGreen'>,
    number
  > = {
    position: findIndex('№', true),
    uid: findIndex('Уникальный код'),
    totalScore: findIndex('Сумма баллов'),
    scoreSubjectsSum: findIndex('Сумма баллов по предметам'),
    scoreCompetitive: findIndex('Сумма баллов за инд.дост.'),
    preemptiveRight: findIndex('преимущ.право'),
    originalInUniversity: findIndex('Оригинал в вузе'),
    originalFromEGPU: findIndex('Оригинал из ЕПГУ'),
    state: findIndex('Состояние'),
    priority: findIndex('Приоритет'),
    priorityHight: findIndex('Высший приоритет'),
  };
  return indexes;
};
