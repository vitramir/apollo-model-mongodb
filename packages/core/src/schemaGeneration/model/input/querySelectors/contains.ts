import { getNamedType, isCompositeType } from 'graphql';
import { SelectorOperators } from '@graphex/abstract-datasource-adapter';
import { AMModelField } from '../../../../definitions';
import { AMQuerySelectorFieldFactory } from '../fieldFactories/querySelector';

export class ContainsSelector extends AMQuerySelectorFieldFactory {
  isApplicable(field: AMModelField) {
    return getNamedType(field.type).toString() === 'String';
  }
  getFieldName(field: AMModelField) {
    return `${field.name}_contains`;
  }
  getFieldType(field: AMModelField) {
    const namedType = getNamedType(field.type);

    if (!isCompositeType(namedType)) {
      return namedType;
    }
  }
  transformValue(value: any) {
    return {
      [SelectorOperators.CONTAINS]: value,
    };
  }
}
