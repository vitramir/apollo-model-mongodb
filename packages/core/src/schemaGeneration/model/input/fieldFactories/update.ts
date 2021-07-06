import TypeWrap from '@graphex/type-wrap';
import { getNamedType, isCompositeType } from 'graphql';
import {
  AMInputField,
  AMInputFieldFactory,
  AMInputObjectType,
} from '../../../../definitions';
import { AMDataContext } from '../../../../execution';
import { AMObjectFieldContext } from '../../../../execution/contexts/objectField';

export class AMUpdateFieldFactory extends AMInputFieldFactory {
  isApplicable(field) {
    return (
      !isCompositeType(getNamedType(field.type)) &&
      !field.isID &&
      !field.isReadOnly
    );
  }
  getFieldName(field) {
    return field.name;
  }
  getField(field): AMInputField {
    return {
      name: this.getFieldName(field),
      extensions: undefined,
      type: new TypeWrap(field.type)
        .setRequired(false)
        .type() as AMInputObjectType,
      amEnter(node, transaction, stack) {
        const action = new AMObjectFieldContext(field.dbName);
        stack.push(action);
      },
      amLeave(node, transaction, stack) {
        const operation = stack.lastOperation();
        const path = stack.getFieldPath(operation);
        const context = stack.pop() as AMObjectFieldContext;

        const data = operation.data;
        const set = (data.data && data.data['$set']) || {};
        data.addValue('$set', set);
        set[path] = context.value;
      },
    };
  }
}
