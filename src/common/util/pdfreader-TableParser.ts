import type { Text } from 'pdf2json';

export class TableParser {
  public rows: Record<string, Record<number, Text[]>> = {};

  /** @returns an 3-dimension matrix: row -> column -> items_collisionning_in_column -> item */
  public getMatrix() {
    const rows = this.getRows();

    const xSet = {};
    for (const y in rows) {
      for (const x in rows[y]) {
        xSet[x] = true;
      }
    }
    const xValues = sortAsFloatValues(Object.keys(xSet));

    return rows.map(function (row, y) {
      const rowNew: Text[][] = [];
      for (const x in row) {
        const items = row[x];
        const colN = xValues.indexOf(x);
        rowNew[colN] = (rowNew[colN] || []).concat(items);
      }
      return rowNew;
    });
  }

  /**
   * For use with console.table().
   * @param {String} collisionSeparator separator to use when there are multiple values to join for a given column
   * @returns a 2-dimension matrix: row -> column -> value
   */
  public getCleanMatrix({
    collisionSeparator,
  }: { collisionSeparator?: string } = {}) {
    return this.getMatrix().map((rowColumns) =>
      rowColumns.map((items) =>
        items
          .map((item) => item.text)
          .join(collisionSeparator || '')
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      ),
    );
  }

  public processItem(item: Text, colN: number, rowN?: number) {
    rowN ??= Number(item.y.toFixed(2));

    const row = (this.rows[rowN] = this.rows[rowN] || {});
    (row[colN] = row[colN] || []).push(item);
  }

  // Rows

  public getRows() {
    const yValues = sortAsFloatValues(Object.keys(this.rows));
    return yValues.map((y) => this.rows[y]);
  }

  public renderRows() {
    return this.getRows()
      .map(function (row, rowId) {
        const cells = [];
        for (const i in row)
          for (const j in row[i])
            cells.push(row[i][j].x + ': ' + row[i][j].text);
        return rowId + ':\t' + cells.join(', ');
      })
      .join('\n');
  }

  public reset() {
    this.rows = {};
  }
}

// * Utils

const sortAsFloatValues = (values: string[]) =>
  values.slice().sort((a, b) => parseFloat(a) - parseFloat(b));
