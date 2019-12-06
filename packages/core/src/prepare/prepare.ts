import { GraphQLSchema } from 'graphql';
import { fillDbName } from './fillDbName';
import { addVisitorEvents } from './addVisitorEvents';
import { fieldFactories } from './fieldFactories';
import { fieldVisitorEvents } from './fieldVisitorEvents';

import { relationDirective } from './relationDirective';
import { extRelationDirective } from './extRelationDirective';
import { createdAtDirective } from './createdAtDirective';
import { updatedAtDirective } from './updatedAtDirective';

export const prepare = (
  schema: GraphQLSchema,
  options: { fieldFactoriesMap: {}; fieldVisitorEventsMap: {} }
) => {
  fillDbName(schema);
  relationDirective(schema);
  extRelationDirective(schema);
  addVisitorEvents(schema);
  fieldFactories(schema, options.fieldFactoriesMap);
  fieldVisitorEvents(schema, options.fieldVisitorEventsMap);

  /* directives */
  createdAtDirective(schema);
  updatedAtDirective(schema);
};
