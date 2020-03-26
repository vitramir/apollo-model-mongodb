import { GraphQLInt, GraphQLNonNull, isInterfaceType } from 'graphql';
import pluralize from 'pluralize';
import R from 'ramda';
import {
  AMField,
  AMMethodFieldFactory,
  AMModelType,
  GraphQLOperationType,
} from '../definitions';
import { AMSelectorContext } from '../execution/contexts/selector';
import { AMDeleteOperation } from '../execution/operations/deleteOperation';
import { AMInterfaceWhereTypeFactory } from '../inputTypes/interfaceWhere';
import { AMWhereTypeFactory } from '../inputTypes/where';
import { resolve } from '../resolve';

export class AMModelDeleteManyMutationFieldFactory extends AMMethodFieldFactory {
  getOperationType() {
    return GraphQLOperationType.Mutation;
  }
  getFieldName(modelType: AMModelType): string {
    return R.pipe(pluralize, R.concat('delete'))(modelType.name);
  }
  getField(modelType: AMModelType) {
    return <AMField>{
      name: this.getFieldName(modelType),
      description: '',
      isDeprecated: false,
      type: new GraphQLNonNull(GraphQLInt),
      args: [
        {
          name: 'where',
          type: new GraphQLNonNull(
            this.configResolver.resolveInputType(modelType, this.links.where)
          ),
        },
      ],
      amEnter(node, transaction, stack) {
        const operation = new AMDeleteOperation(transaction, {
          many: true,
          collectionName: modelType.mmCollectionName,
        });
        stack.push(operation);
      },
      amLeave(node, transaction, stack) {
        const context = stack.pop() as AMDeleteOperation;
        if (modelType.mmDiscriminatorField && modelType.mmDiscriminator) {
          if (!context.selector) {
            context.setSelector(new AMSelectorContext());
          }

          context.selector.addValue(
            modelType.mmDiscriminatorField,
            modelType.mmDiscriminator
          );
        }
      },
      resolve: resolve,
    };
  }
}
