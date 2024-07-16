import { md5 } from '@my-common';
import {
  FormTrainingType,
  // LevelTrainingType,
  AbiturientInfoStateType,
  IncomingsPageInfo,
  IncomingsPageOriginalInfo,
  AbiturientInfo,
  AbiturientInfo_Base,
  AbiturientInfo_Bachelor,
  AbiturientInfo_Magister,
  AbiturientInfoComb,
} from '@my-interfaces';

type ParsedTable = string;
type ParsedTableIncomings = ParsedTable & {
  isGreen?: boolean;
  isRed?: boolean;
};

export const parseIncomingsInfo = (
  tbodyData: string[][],
  indexTable?: number,
  infos?: { title: string; rows: any[] }[],
) => {
  let [
    ,
    // Списки поступающих
    // Дата формирования - 07.07.2022. Время формирования - 15:00:00.
    [buildDate],
    // Основание поступления - Бюджетная основа
    [basisAdmission],
    // Форма обучения - Очная
    [formTraining],
    // Категория приема
    [admissionCategory],
    // Подразделение
    [division],
    // Всего мест: 9. Зачислено: 0. К зачислению: 9.
    [numbersInfo],
  ] = tbodyData;

  const originalInfo: IncomingsPageOriginalInfo = {
    buildDate,
    // prkomDate,
    // competitionGroupName,
    formTraining,
    // levelTraining,
    // directionTraining,
    basisAdmission,
    // sourceFunding,
    numbersInfo,
    division,
    admissionCategory,
  };

  // ! hardcode. or smart get from table
  tbodyData.splice(0, Object.keys(originalInfo).length + 1);

  const info: IncomingsPageInfo = {
    buildDate: (({ DD, MM, YYYY, time } = {}) =>
      !time ? null : new Date(`${YYYY}.${MM}.${DD} ${time}`))(
      buildDate.match(
        /.* - (?<DD>[0-9]{2})\.(?<MM>[0-9]{2})\.(?<YYYY>[0-9]{4})\. .* - (?<time>[0-9:]+).$/i,
      )?.groups,
    ),
    // prkom: (({ number, DD, MM, YYYY, time } = {}) =>
    //   !number && !time
    //     ? null
    //     : {
    //         number: Number(number),
    //         date: new Date(`${YYYY}.${MM}.${DD} ${time}`),
    //       })(
    //   prkomDate.match(
    //     /.* ?- .* ? (?<number>[0-9]{1,4}) от (?<DD>[0-9]{2})\.(?<MM>[0-9]{2})\.(?<YYYY>[0-9]{4}) (?<time>[0-9:]+)$/i,
    //   )?.groups,
    // ),
    // competitionGroupName: (({ name } = {}) => name || null)(
    //   competitionGroupName.match(/(?![^-]+)- (?<name>.*)/i)?.groups,
    // ),
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
    // levelTraining: (({ type } = {}) => {
    //   let str = type.toLocaleLowerCase();
    //   switch (true) {
    //     case str.startsWith('бакалавриат'):
    //       return LevelTrainingType.Bachelor;
    //     case str.startsWith('специалитет'):
    //       return LevelTrainingType.Specialty;
    //     case str.startsWith('магистратура'):
    //       return LevelTrainingType.Magister;
    //     case str.startsWith('аспирантура'):
    //       return LevelTrainingType.Postgraduate;
    //     default:
    //       return LevelTrainingType.Unknown;
    //   }
    // })(levelTraining.match(/(?![^-]+)- (?<type>.*)/i)?.groups),
    // directionTraining: (({ code, name } = {}) =>
    //   !name ? null : { code, name })(
    //   directionTraining.match(/(?![^-]+)- (?<code>[0-9\.]+) (?<name>.*)/i)
    //     ?.groups,
    // ),
    basisAdmission: (({ name } = {}) => name || null)(
      basisAdmission.match(/(?![^-]+)- (?<name>.*)/i)?.groups,
    ),
    // sourceFunding: (({ name } = {}) => name || null)(
    //   sourceFunding.match(/(?![^-]+)- (?<name>.*)/i)?.groups,
    // ),
    numbersInfo: ((nums) =>
      !nums
        ? null
        : Object.keys(nums).reduce(
            (p, c) => ({ ...p, [c]: Number(nums[c]) }),
            {} as IncomingsPageInfo['numbersInfo'],
          ))(
      numbersInfo?.match(
        /.*: (?<total>[0-9]{1,4})\..*: (?<enrolled>[0-9]{1,4})\..*: (?<toenroll>[0-9]{1,4})\.?$/i,
      )?.groups,
    ),
    receptionFeatures: 'none',
  };

  const [titles] = tbodyData.splice(0, 1);
  if (titles[2] !== 'Уникальный код') {
    console.warn('? Failed to parse table #2');
  }

  let listApplicants: AbiturientInfo[] = [];
  listApplicants = parseBachelor(tbodyData, titles);
  // switch (info.levelTraining) {
  //   case LevelTrainingType.Bachelor:
  //   case LevelTrainingType.Specialty:
  //     listApplicants = parseBachelor(tbodyData, titles);
  //     break;
  //   case LevelTrainingType.Magister:
  //   case LevelTrainingType.Postgraduate:
  //     listApplicants = parseMagister(tbodyData, titles);
  //     break;
  // }

  const preparedTitles = titles
    .map((e) => e?.trim().replace(/\s/g, ' '))
    .filter(Boolean);

  // let subInfo = undefined;
  // if (indexTable !== undefined && infos?.length > 0) {
  //   const infoss = infos.flatMap((e) => e.rows);
  //   subInfo = infoss[indexTable];
  // }

  const typeReceptionFeatures = listApplicants.find(
    (e) => e.receptionFeatures,
  )?.receptionFeatures;

  info.receptionFeatures = typeReceptionFeatures || 'none';

  return {
    originalInfo,
    info,
    // subInfo,
    list: listApplicants,
    titles: preparedTitles,
    hash: md5(
      originalInfo.admissionCategory +
        '|' +
        originalInfo.division +
        '|' +
        typeReceptionFeatures,
    ),
  };
};

const numOrNul = (val: string) => (!isNaN(Number(val)) ? Number(val) : null);

const prepareType = (
  val: string,
  key?: keyof AbiturientInfoComb | 'preemptiveRight2',
) => {
  switch (key) {
    // * Number or null
    case 'position':
    case 'totalScore':
    case 'scoreSubjectsSum':
    case 'scoreCompetitive':
    case 'priority':
      return numOrNul(val);
    // * Bool
    case 'preemptiveRight':
    case 'preemptiveRight2':
    case 'originalInUniversity':
    case 'originalFromEGPU':
    case 'isHightPriority':
      return Boolean(val);
    // * Enum
    case 'state':
      return ((content) =>
        content === 'Подано'.toLocaleLowerCase()
          ? AbiturientInfoStateType.Submitted
          : content === 'Зачислен'.toLocaleLowerCase()
          ? AbiturientInfoStateType.Enrolled
          : AbiturientInfoStateType.Unknown)(val?.toLocaleLowerCase());
    // * Strings
    case 'docType':
      return !val
        ? 'none'
        : val.toLowerCase() === 'копия'
        ? 'copy'
        : val.toLowerCase() === 'оригинал'
        ? 'original'
        : 'none';
    case 'receptionFeatures':
      return !val
        ? 'none'
        : val.toLowerCase() === 'отдельная квота'
        ? 'separate'
        : val.toLowerCase() === 'общие места'
        ? 'common'
        : 'none';
    case 'uid':
    default:
      return val;
  }
};

const parseBachelor = (
  tbodyData: ParsedTableIncomings[][],
  titles: ParsedTableIncomings[],
) => {
  const listApplicants: AbiturientInfo_Bachelor[] = [];

  const baseIndexes = parseBaseTitleIndexes(titles);
  const ssIndex = baseIndexes.scoreSubjectsSum ?? baseIndexes.totalScoreStrict;
  const subjectsCount = baseIndexes.scoreCompetitive - ssIndex - 1;
  // console.log('baseIndexes', baseIndexes);

  for (const data of tbodyData) {
    const getData = (
      i: number,
      key?: keyof AbiturientInfoComb | keyof typeof baseIndexes,
    ) =>
      i === null
        ? null
        : key
        ? (prepareType(data[i], key as any) as any)
        : data[i];

    const payload = Object.fromEntries(
      Object.entries(baseIndexes)
        .map(([key, i]: [keyof typeof baseIndexes, number]) =>
          key == 'totalScoreStrict' ? null : [key, getData(i, key)],
        )
        .filter(Boolean),
    ) as AbiturientInfo_Base;

    if (!payload.preemptiveRight && payload['preemptiveRight2']) {
      payload.preemptiveRight = payload['preemptiveRight2'];
    }
    delete payload['preemptiveRight2'];

    listApplicants.push({
      isGreen: data[0].isGreen,
      isRed: data[0].isRed,

      ...payload,

      scoreSubjects: new Array(subjectsCount > 0 ? subjectsCount : 0)
        .fill(0)
        .map((_e, i) => [
          numOrNul(getData(ssIndex + i + 1)),
          titles[ssIndex + i + 1],
        ]),
    });
  }
  return listApplicants;
};

const parseMagister = (
  tbodyData: ParsedTableIncomings[][],
  titles: ParsedTableIncomings[],
) => {
  const listApplicants: AbiturientInfo_Magister[] = [];

  const findIndex = makeFindIndex(titles);
  const baseIndexes = parseBaseTitleIndexes(titles);
  const scoreExamIndex = findIndex('Вступительное испытание');

  for (const data of tbodyData) {
    const getData = (
      i: number,
      key?: keyof AbiturientInfoComb | keyof typeof baseIndexes,
    ) => (key ? (prepareType(data[i], key as any) as any) : data[i]);

    listApplicants.push({
      isGreen: data[0].isGreen,
      isRed: data[0].isRed,

      ...(Object.fromEntries(
        Object.entries(baseIndexes)
          .map(([key, i]: [keyof typeof baseIndexes, number]) =>
            key === 'totalScoreStrict' ? null : [key, getData(i, key)],
          )
          .filter(Boolean),
      ) as AbiturientInfo_Base),

      scoreExam: getData(scoreExamIndex, 'scoreExam') || null,
    });
  }
  return listApplicants;
};

const makeFindIndex = (titles: ParsedTable[]) => {
  const preparedTitles = titles
    .map((e) => e?.toLocaleLowerCase().trim().replace(/\s/g, '_'))
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

const parseBaseTitleIndexes = (titles: ParsedTableIncomings[]) => {
  const findIndex = makeFindIndex(titles);

  const indexes: Record<
    | keyof Omit<AbiturientInfo_Base, 'isRed' | 'isGreen'>
    | 'totalScoreStrict'
    | 'preemptiveRight2',
    number
  > = {
    position: findIndex('№', true),
    uid: findIndex('Уникальный код'),
    totalScore: findIndex('Сумма баллов'),
    totalScoreStrict: findIndex('Сумма баллов', true),
    scoreSubjectsSum: findIndex('Сумма баллов по предметам'),
    scoreCompetitive: findIndex('Сумма баллов за инд.дост.'),
    preemptiveRight: findIndex('Есть преимущественное право'),
    preemptiveRight2: findIndex('Преимущ.право'),
    // preemptiveRight2: findIndex('Преимущ. право'),
    receptionFeatures: findIndex('Особенности приема'),
    originalInUniversity: findIndex('Оригинал в вузе'),
    originalFromEGPU: findIndex('Оригинал из ЕПГУ'),
    state: findIndex('Состояние'),
    priority: findIndex('Приоритет'),
    isHightPriority: findIndex('Это высший приоритет'),
    docType: findIndex('Вид документа'),
  };
  return indexes;
};
