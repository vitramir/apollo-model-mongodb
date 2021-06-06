import TypeWrap from '@graphex/type-wrap';
import {
  AMInputField,
  AMInputFieldFactory,
  AMModelType,
} from '../../definitions';
import { defaultObjectFieldVisitorHandler } from '../visitorHandlers';

export class AMCreateRelationFieldFactory extends AMInputFieldFactory {
  isApplicable(field) {
    return Boolean(field.relation);
  }
  getFieldName(field) {
    return field.name;
  }
  getField(field) {
    const typeWrap = new TypeWrap(field.type);
    const isMany = typeWrap.isMany();
    const isRequired = typeWrap.isRequired();
    const type = this.configResolver.resolveInputType(
      typeWrap.realType() as AMModelType,
      isMany
        ? this.links.many
        : isRequired
        ? this.links.oneRequired
        : this.links.one
    );

    return {
      name: this.getFieldName(field),
      type,
      ...defaultObjectFieldVisitorHandler(field.relation.storeField, field),
    } as AMInputField;
  }
}
