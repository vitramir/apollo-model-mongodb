import { AMContext } from '../context';
import { AMObjectFieldValueType } from '../../definitions';
import { SelectorOperator } from '@graphex/abstract-datasource-adapter';

type Data = Partial<Record<string | SelectorOperator, AMObjectFieldValueType>>;

export class AMDataContext extends AMContext {
  data: Data;

  constructor(data?: Data) {
    super();
    if (data) {
      this.data = data;
    }
  }

  addValue(key: string | SelectorOperator, value: AMObjectFieldValueType) {
    if (!this.data) this.data = {};
    this.data[key] = value;
  }

  setData(value: Data) {
    this.data = value;
  }

  toJSON() {
    return this.data;
  }
}
