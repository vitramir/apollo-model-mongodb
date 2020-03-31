import TypeWrap from '@apollo-model/type-wrap';
import { getNamedType, isCompositeType } from 'graphql';
import {
  AMInputField,
  AMInputFieldFactory,
  AMModelType,
} from '../../definitions';
import { AMObjectFieldContext } from '../../execution/contexts/objectField';
import {
  getFieldPath,
  getLastOperation,
  getOperationData,
} from '../../execution/utils';

export class AMUpdateNestedFieldFactory extends AMInputFieldFactory {
  isApplicable(field) {
    return isCompositeType(getNamedType(field.type)) && !field.relation;
  }
  getFieldName(field) {
    return field.name;
  }
  getField(field) {
    const typeWrap = new TypeWrap(field.type);
    let type = this.configResolver.resolveInputType(
      typeWrap.realType() as AMModelType,
      typeWrap.isMany() ? this.links.many : this.links.one
    );

    return <AMInputField>{
      name: this.getFieldName(field),
      type,
      amEnter(node, transaction, stack) {
        const action = new AMObjectFieldContext(field.dbName);
        stack.push(action);
      },
      amLeave(node, transaction, stack) {
        const operation = getLastOperation(stack);
        const path = getFieldPath(stack, operation);
        const context = stack.pop() as AMObjectFieldContext;

        if (context.value) {
          const data = getOperationData(stack, operation);
          const set = (data.data && data.data['$set']) || {};
          data.addValue('$set', set);
          set[path] = context.value;
        }
      },
    };
  }
}
