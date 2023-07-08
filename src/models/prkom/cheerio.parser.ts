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
  AbiturientInfo_Bachelor,
  AbiturientInfo_Magister,
  AbiturientInfo,
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

export const parseIncomingsInfo = async (html: string) => {
  const $ = cheerio.load(html);

  if (!$('body > table > tbody').get(0)) {
    return null;
  }

  let greenSelector: string = null;
  for (const el of $('style')) {
    const css = $(el).text();
    const rules = findCssRules(css, 'background-color', '#90ee90');
    if (rules.length > 0) {
      greenSelector = rules[0]?.selectors[0];
      if (greenSelector) {
        greenSelector = greenSelector.split('.').slice(-1)[0];
      }
      break;
    }
  }

  // // to delete extra columns
  // $('body > table > tbody td[colspan=12]').removeAttr('colspan');

  let tbodyData = parseTable($('body > table > tbody').get(0), {
    parser(element) {
      const content = $(element).text().trim();
      const isGreen =
        (greenSelector && $(element).hasClass(greenSelector)) || false;
      // const classes = $(element).attr('class');
      return content && /* classes && */ { isGreen, content /* classes */ };
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
        case str.startsWith('бакалавр'):
          return LevelTrainingType.Bachelor;
        case str.startsWith('магистр'):
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
      listApplicants = parseBachelor(tbodyData, titles);
      break;
    case LevelTrainingType.Magister:
      listApplicants = parseMagister(tbodyData);
      break;
    case LevelTrainingType.Postgraduate:
      // listApplicants = parseMaga(tbodyData);
      break;
  }

  return {
    originalInfo,
    info,
    list: listApplicants,
  };
};

const parseBachelor = (
  tbodyData: { isGreen: boolean; content: string }[][],
  titles: { isGreen: boolean; content: string }[],
) => {
  const listApplicants: AbiturientInfo_Bachelor[] = [];

  let idxStart = titles.findIndex((e) =>
    e.content.startsWith('Сумма баллов по предметам'),
  );
  let idxEnd = titles.findIndex((e) =>
    e.content.startsWith('Сумма баллов за инд'),
  );
  let subjectsCount = idxEnd - idxStart - 1;

  for (const data of tbodyData) {
    let ind = -1;
    const nextCol = () => data[++ind]?.content;
    const nextColNum = (val = nextCol()) =>
      !isNaN(Number(val)) ? Number(val) : null;

    listApplicants.push({
      isGreen: data[0].isGreen,
      // * №
      position: nextColNum(),
      // * Уникальный код
      uid: nextCol(),
      // * Сумма баллов
      totalScore: nextColNum(),
      // * Сумма баллов по предметам
      scoreSubjectsSum: nextColNum(),
      scoreSubjects: new Array(subjectsCount)
        .fill(0)
        // .map(() => nextColNum()),
        .map(() => [nextColNum(), titles[ind]?.content]),
      // * Сумма баллов за инд.дост.(конкурсные)
      scoreCompetitive: nextColNum(),
      // * Преимущ. право
      preemptiveRight: !!nextCol(),
      // * Оригинал в вузе
      originalInUniversity: !!nextCol(),
      // * Состояние
      state: ((content) =>
        content === 'Подано'.toLocaleLowerCase()
          ? AbiturientInfoStateType.Submitted
          : content === 'Зачислен'.toLocaleLowerCase()
          ? AbiturientInfoStateType.Enrolled
          : AbiturientInfoStateType.Unknown)(nextCol()?.toLocaleLowerCase()),
      // // * Согласие на др.напр.
      // consentToanotherDirection: !!nextCol(),
      // * Приоритет
      priority: nextColNum(),
      // * Высший приоритет
      priorityHight: nextColNum(),
    });
  }
  return listApplicants;
};

const parseMagister = (
  tbodyData: { isGreen: boolean; content: string }[][],
) => {
  const listApplicants: AbiturientInfo_Magister[] = [];
  for (const data of tbodyData) {
    let ind = -1;
    const nextCol = () => data[++ind]?.content;
    const nextColNum = (val = nextCol()) =>
      !isNaN(Number(val)) ? Number(val) : null;

    listApplicants.push({
      isGreen: data[0].isGreen,
      // * №
      position: nextColNum(),
      // * Уникальный код
      uid: nextCol(),
      // * Сумма баллов
      totalScore: nextColNum(),
      // * Сумма баллов по предметам
      scoreSubjectsSum: nextColNum(),
      // * Вступительное испытание ...
      scoreExam: nextColNum(),
      // // * Собеседование ...
      // scoreInterview: nextColNum(),
      // * Сумма баллов за инд.дост.(конкурсные)
      scoreCompetitive: nextColNum(),
      // * Преимущ. право
      preemptiveRight: !!nextCol(),
      // // * Согласие на зачисление
      // consentTransfer: !!nextCol(),
      // // * Оригинал
      // original: !!nextCol(),
      // * Оригинал в вузе
      originalInUniversity: !!nextCol(),
      // * Состояние
      state: ((content) =>
        content === 'Подано'.toLocaleLowerCase()
          ? AbiturientInfoStateType.Submitted
          : content === 'Зачислен'.toLocaleLowerCase()
          ? AbiturientInfoStateType.Enrolled
          : AbiturientInfoStateType.Unknown)(nextCol()?.toLocaleLowerCase()),
      // // * Согласие на др.напр.
      // consentToanotherDirection: !!nextCol(),
      // * Приоритет
      priority: nextColNum(),
      // * Высший приоритет
      priorityHight: nextColNum(),
    });
  }
  return listApplicants;
};
