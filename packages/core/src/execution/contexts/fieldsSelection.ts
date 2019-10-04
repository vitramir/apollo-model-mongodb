import { AMContext } from '../context';

export class AMFieldsSelectionContext extends AMContext {
  fields: string[] = [];

  constructor(fields?: string[]) {
    super();
    if (fields) {
      this.fields = fields;
    }
  }

  addField(fieldName: string) {
    this.fields.push(fieldName);
  }

  toJSON() {
    return { fields: this.fields };
  }
}
