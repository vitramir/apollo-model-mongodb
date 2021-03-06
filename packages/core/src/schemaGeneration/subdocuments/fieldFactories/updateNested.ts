import TypeWrap from '@graphex/type-wrap';
import { AMInputFieldFactory, AMModelType } from '../../../definitions';
import { AMObjectFieldContext } from '../../../execution/contexts/objectField';
import { isSubdocumentField } from '../../../utils';

export class AMUpdateNestedFieldFactory extends AMInputFieldFactory {
  isApplicable(field) {
    return isSubdocumentField(field);
  }
  getFieldName(field) {
    return field.name;
  }
  getField(field) {
    const typeWrap = new TypeWrap(field.type);
    const type = this.configResolver.resolveInputType(
      typeWrap.realType() as AMModelType,
      typeWrap.isMany() ? this.links.many : this.links.one
    );

    return {
      name: this.getFieldName(field),
      extensions: undefined,
      type,
      amEnter(node, transaction, stack) {
        const action = new AMObjectFieldContext(field.dbName);
        stack.push(action);
      },
      amLeave(node, transaction, stack) {
        const operation = stack.lastOperation();
        const path = stack.getFieldPath(operation);
        const context = stack.pop() as AMObjectFieldContext;

        if (context.value) {
          const data = stack.getOperationData(operation);
          const set = (data.data && data.data['$set']) || {};
          data.addValue('$set', set);
          if (context.value) {
            set[path] = context.value;
          }
        }
      },
    };
  }
}
