import * as PDFParserClass from 'pdf2json';
import type PDFParser from 'pdf2json';
import type { Text } from 'pdf2json';
import { TableParser } from '@my-common';

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
