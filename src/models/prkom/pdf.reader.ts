import * as PDFParserClass from 'pdf2json';
import type PDFParser from 'pdf2json';
import type { Text } from 'pdf2json';
import { TableParser } from '@my-common';
import { DirInfo } from '@my-interfaces';

declare module 'pdf2json' {
  interface Text {
    text: string;
  }
}

// const colThresholdsByTable: Record<number, (number | number[])[]> = {
//   0: [Infinity],
// };

const columnQuantitizer = (
  colThresholdsByTable: Record<number, (number | number[])[]>,
  item: Text,
  tableIndex: number,
) => {
  const colN = colThresholdsByTable[tableIndex].findIndex((colThreshold) =>
    Array.isArray(colThreshold)
      ? item.x - 0.1 <= Math.max(...colThreshold) &&
        Math.min(...colThreshold) <= item.x + 0.1
      : item.x - 0.1 <= colThreshold,
  );

  // console.log(
  //   `COL [${tableIndex}] ${colN}\tX:${item.x
  //     .toFixed(3)
  //     .padStart(6, ' ')}\tY:${item.y.toFixed(3).padStart(6, ' ')}\t${
  //     item.text
  //   }`,
  // );

  return colN;
};

export const loadSpiski = (dataBuffer: Buffer) =>
  new Promise<string[][][]>((resolve, reject) => {
    const table = new TableParser();

    const colThresholdsByTable: Record<number, (number | number[])[]> = {
      0: [Infinity],
    };

    let tableIndex = -1;
    let textItter = 0;
    let rowItter = 0;
    let prevColN = 0;

    let tables: string[][][] = [];
    const pdfParser = new (PDFParserClass as any)(null, null) as PDFParser;
    pdfParser.on('pdfParser_dataError', (errData) =>
      reject(errData.parserError),
    );
    pdfParser.on('pdfParser_dataReady', (pdf) => {
      const Pages = pdf.Pages;
      let needSaveTable = false;
      let needRecalcTable = true;

      function checkSave(save?: boolean) {
        if (needSaveTable || save) {
          const tableData = table.getCleanMatrix();
          if (tableData.length > 0) {
            tables.push(tableData);
          }
          table.reset();

          needRecalcTable = true;
          needSaveTable = false;
          tableIndex = -1;
          textItter = 0;
          rowItter = 0;
          prevColN = 0;
        }
      }

      for (const p in Pages) {
        const page = Pages[p];
        const pageNumber = +p + 1;

        // const isNewTable =
        //   page.VLines.length > 3 && page.VLines[0].clr && page.VLines[1].clr;
        // console.log({ isNewTable });

        const tableColumns: {
          startX: number;
          endX: number;
          startY: number;
          endY: number;
          height: number;
        }[] = [];
        let prevY = 0;

        if (needRecalcTable) {
          needRecalcTable = false;
          tableColumns.splice(0, tableColumns.length);
          const chunkSize = 2;
          const cpyLines = [...page.VLines];
          const chLines = [
            ...Array(Math.ceil(cpyLines.length / chunkSize)),
          ].map(() => cpyLines.splice(0, chunkSize));

          for (const v in chLines) {
            // const hLine = page.HLines[v];
            const [vLine, vLine2] = chLines[v];
            if (vLine.clr || vLine2.clr) {
              continue;
            }

            if (vLine.l !== vLine2.l) {
              throw new Error("Vertical lines don't have same height");
            }

            if (vLine.y !== vLine2.y) {
              throw new Error("Vertical lines don't have same y position");
            }

            if (prevY > 0 && vLine.y > prevY) {
              break;
            }
            prevY = vLine.y;

            const fixTo = (e: number, s: number = 3) =>
              Math.floor(e * 10 ** s) / 10 ** s;
            tableColumns.push({
              startX: fixTo(vLine.x - vLine.w / 2),
              endX: fixTo(vLine2.x - vLine2.w / 2),
              startY: fixTo(vLine.y),
              endY: fixTo(vLine.y + vLine.l - vLine.w),
              height: fixTo(vLine.l),
            });
          }

          // Списки поступающих
          colThresholdsByTable[0] = [/* 15.5,  */ Infinity];
          // Дата формирования ...
          colThresholdsByTable[1] = [/* 2.592, */ Infinity];
          colThresholdsByTable[2] = tableColumns.map((col) => [
            col.startX,
            col.endX,
          ]);
          colThresholdsByTable[2].push(Infinity);
        }

        let itterFix = 0;
        let eighter = 8;
        for (const t in page.Texts) {
          const item = page.Texts[t];
          item.text = decodeURIComponent(item.R.flatMap((r) => r.T).join('\t'));
          if (item.text === 'Списки поступающих' && tableIndex > 0) {
            needSaveTable = true;
            checkSave();
          }

          ++textItter;

          // Fix two rows from 'Подразделение'
          if (textItter < 9 && item.text.startsWith('Всего мест:')) {
            // x: 2.585
            eighter = textItter + 1;
          }

          if (
            textItter == 1 ||
            textItter == 2 ||
            textItter == eighter
            // textItter == 30
          ) {
            ++tableIndex;
          }

          const colN = columnQuantitizer(
            colThresholdsByTable,
            item,
            tableIndex,
          );
          const rowNumber = Number(item.text);
          if (
            rowItter < eighter ||
            (colN < prevColN &&
              ((!isNaN(rowNumber) && rowNumber === 1) || rowItter > eighter))
          ) {
            ++rowItter;
          }
          prevColN = colN;
          if (rowItter === 7 && !item.text.startsWith('Всего мест:')) {
            // --rowItter;
            --itterFix;
          }
          const rowN = rowItter + itterFix;

          // if (rowItter > 10) break;
          // if (rowItter > 6)
          // accumulate text items into rows object, per line
          table.processItem(item, colN, rowN);
        }
      }

      checkSave(true);

      resolve(tables);
    });
    pdfParser.parseBuffer(dataBuffer);
  });

export const loadInformaziya = (dataBuffer: Buffer) =>
  new Promise<string[][]>((resolve, reject) => {
    const table = new TableParser();

    const colThresholdsByTable: Record<number, (number | number[])[]> = {
      0: [Infinity],
    };

    let tableIndex = -1;
    let textItter = 0;
    let rowItter = 0;
    let prevColN = 0;

    const pdfParser = new (PDFParserClass as any)(null, null) as PDFParser;
    pdfParser.on('pdfParser_dataError', (errData) =>
      reject(errData.parserError),
    );
    pdfParser.on('pdfParser_dataReady', (pdf) => {
      const Pages = pdf.Pages;

      const tableColumns: {
        startX: number;
        endX: number;
        startY: number;
        endY: number;
        height: number;
      }[] = [];

      for (const p in Pages) {
        const page = Pages[p];
        const pageNumber = +p + 1;
        // if (pageNumber > 1) break;

        let prevY = 0;
        if (pageNumber == 1) {
          tableColumns.splice(0, tableColumns.length);
          const chunkSize = 2;
          const cpyLines = [...page.VLines];
          const chLines = [
            ...Array(Math.ceil(cpyLines.length / chunkSize)),
          ].map(() => cpyLines.splice(0, chunkSize));

          for (const v in chLines) {
            // const hLine = page.HLines[v];
            const [vLine, vLine2] = chLines[v];
            if (vLine.clr || vLine2.clr) {
              continue;
            }

            if (vLine.l !== vLine2.l) {
              throw new Error("Vertical lines don't have same height");
            }

            if (vLine.y !== vLine2.y) {
              throw new Error("Vertical lines don't have same y position");
            }

            if (prevY > 0 && vLine.y > prevY) {
              break;
            }
            prevY = vLine.y;

            // "Виды договоров" - 17.637
            if (vLine.x > 17.637) {
              break;
            }

            const fixTo = (e: number, s: number = 3) =>
              Math.floor(e * 10 ** s) / 10 ** s;
            tableColumns.push({
              startX: fixTo(vLine.x - vLine.w / 2),
              endX: fixTo(vLine2.x - vLine2.w / 2),
              startY: fixTo(vLine.y),
              endY: fixTo(vLine.y + vLine.l - vLine.w),
              height: fixTo(vLine.l),
            });
          }

          colThresholdsByTable[0] = [Infinity];
          colThresholdsByTable[1] = tableColumns.map((col) => [
            col.startX,
            col.endX,
          ]);
          colThresholdsByTable[1].push(Infinity);
        }

        for (const t in page.Texts) {
          const item = page.Texts[t];
          item.text = decodeURIComponent(item.R.flatMap((r) => r.T).join('\t'));

          ++textItter;
          if (textItter == 1 || textItter == 2) {
            ++tableIndex;
          }

          // "Виды договоров" - 17.637
          if (item.x >= 17.637) {
            continue;
          }

          const colN = columnQuantitizer(
            colThresholdsByTable,
            item,
            tableIndex,
          );
          const rowNumber = Number(item.text);
          if (rowItter < 2 || colN < prevColN) {
            ++rowItter;
          }
          prevColN = colN;
          const rowN = rowItter;

          // if (rowItter > 10) break;
          // if (rowItter > 6)
          // accumulate text items into rows object, per line
          table.processItem(item, colN, rowN);
        }

        // return resolve(page as any);
      }

      resolve(table.getCleanMatrix());
    });
    pdfParser.parseBuffer(dataBuffer);
  });

export const formatInformaziya = (tableData: string[][]) => {
  const [infoTitle] = tableData[0];
  let parsedRows: DirInfo[] = [];

  for (const i in tableData) {
    const row = tableData[i];
    if (
      +i == 0 ||
      +i == 1 ||
      +i == tableData.length - 2 ||
      +i == tableData.length - 1
    ) {
      continue;
    }

    let [
      // Конкурсная группа
      competitionGroupName,
      // Направление (специальность)
      directionTraining,
      // Количество мест
      countPlaces,
      // Количество мест по договорам об оказании платных образовательных услуг
      countApplications_paid,
      // Подано заявлений всего
      countApplications,
      // Подано заявлений на бюджетную основу
      countApplications_budgetary,
      // Подано заявлений на целевой прием
      countApplications_targeted,
      // Подано заявлений на полное возмещение затрат
      countApplications_full_compensation,
    ] = row;

    let [codeNum, code, t1, t2, t3, lsns] = competitionGroupName.split('_');

    if (!lsns && t3) {
      lsns = t3;
      t3 = undefined;
    }

    let directionTrainingTest = directionTraining.split('\\');
    if (directionTrainingTest.length > 1) {
      let [directionTrainingCode, ...directionTrainingNameRest] =
        directionTrainingTest[0].split(' ');
      let directionTrainingName = directionTrainingNameRest.join(' ');

      directionTraining = {
        /** Код */
        code: directionTrainingCode,
        /** Название */
        name: directionTrainingName,
      } as any;
    }

    const rowItem = {
      codeNum,
      // code,

      directionTraining,

      // 'О'
      // t1,
      formTraining:
        t1 == 'О' ? 'Очная' : t1 == 'З' ? 'Заочная' : 'Очно-заочная',

      // 'Б' | 'ОК' | 'ПО' | 'Ц'
      t2: t2 as any,
      /** @example `Основание поступления - Бюджетная основа` */
      basisAdmission:
        t2 == 'Б'
          ? 'Бюджетная основа'
          : t2 == 'ПО'
          ? 'Полное возмещение затрат'
          : t2 == 'Ц'
          ? 'Целевой прием'
          : t2 == 'ОК'
          ? 'Бюджетная основа' // 'Отдельная квота'
          : '-',

      /** @example `Категория приема - Основные места в рамках контрольных цифр` */
      admissionCategory:
        t2 == 'ПО'
          ? 'Места по договорам об оказании платных образовательных услуг'
          : t2 == 'Ц'
          ? 'Места в пределах целевой квоты'
          : t2 == 'ОК' || t3 == 'ОП'
          ? 'Места в пределах особой квоты'
          : t2 == 'Б'
          ? 'Основные места в рамках контрольных цифр'
          : '-',

      // 'ОП'
      t3: t3 as any,

      lsns,

      competitionGroupName,
      countPlaces,
      countApplications,
      countApplications_paid,
      countApplications_budgetary,
      countApplications_targeted,
      countApplications_full_compensation,
    };

    parsedRows.push(rowItem);
  }

  return {
    title: infoTitle,
    rows: parsedRows,
  };
};
