import TypeWrap from '@graphex/type-wrap';
import {
  AMInputFieldFactory,
  AMModelField,
  AMModelType,
} from '../../definitions';

export class AMUpdateRelationOutsideFieldFactory extends AMInputFieldFactory {
  isApplicable(field: AMModelField) {
    return Boolean(field.isRelationOutside);
  }
  getFieldName(field) {
    return field.name;
  }
  getField(field) {
    const typeWrap = new TypeWrap(field.type);
    const isMany = typeWrap.isMany();
    const type = this.configResolver.resolveInputType(
      typeWrap.realType() as AMModelType,
      isMany
        ? 'updateManyRelationOutside'
        : // : isRequired
          // ? AMUpdateOneRequiredRelationTypeFactory
          'updateOneRelationOutside'
    );

    return {
      name: this.getFieldName(field),
      extensions: undefined,
      type,
    };
  }
}
