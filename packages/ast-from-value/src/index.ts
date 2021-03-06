/* source: https://github.com/graphql/graphql-js/blob/v14.5.8/src/utilities/astFromValue.js
    issue: https://github.com/graphql/graphql-js/issues/1817
    CUSTOM CODE at line 138 
*/

import { forEach, isCollection } from 'iterall';

import objectValues from 'graphql/polyfills/objectValues';

import inspect from 'graphql/jsutils/inspect';
import invariant from 'graphql/jsutils/invariant';
import isNullish from 'graphql/jsutils/isNullish';
import isInvalid from 'graphql/jsutils/isInvalid';
import isObjectLike from 'graphql/jsutils/isObjectLike';

import { Kind } from 'graphql/language/kinds';

import { GraphQLID } from 'graphql/type/scalars';
import {
  isLeafType,
  isEnumType,
  isInputObjectType,
  isListType,
  isNonNullType,
} from 'graphql/type/definition';

/**
 * Produces a GraphQL Value AST given a JavaScript value.
 *
 * A GraphQL type must be provided, which will be used to interpret different
 * JavaScript values.
 *
 * | JSON Value    | GraphQL Value        |
 * | ------------- | -------------------- |
 * | Object        | Input Object         |
 * | Array         | List                 |
 * | Boolean       | Boolean              |
 * | String        | String / Enum Value  |
 * | Number        | Int / Float          |
 * | Mixed         | Enum Value           |
 * | null          | NullValue            |
 *
 */
export function astFromValue(value, type) {
  if (isNonNullType(type)) {
    const astValue = astFromValue(value, type.ofType);
    if (astValue && astValue.kind === Kind.NULL) {
      return null;
    }
    return astValue;
  }

  // only explicit null, not undefined, NaN
  if (value === null) {
    return { kind: Kind.NULL };
  }

  // undefined, NaN
  if (isInvalid(value)) {
    return null;
  }

  // Convert JavaScript array to GraphQL list. If the GraphQLType is a list, but
  // the value is not an array, convert the value using the list's item type.
  if (isListType(type)) {
    const itemType = type.ofType;
    if (isCollection(value)) {
      const valuesNodes = [];
      forEach(value as Iterable<any>, item => {
        const itemNode = astFromValue(item, itemType);
        if (itemNode) {
          valuesNodes.push(itemNode);
        }
      });
      return { kind: Kind.LIST, values: valuesNodes };
    }
    return astFromValue(value, itemType);
  }

  // Populate the fields of the input object by creating ASTs from each value
  // in the JavaScript object according to the fields in the input type.
  if (isInputObjectType(type)) {
    if (!isObjectLike(value)) {
      return null;
    }
    const fieldNodes = [];
    for (const field of objectValues(type.getFields())) {
      const fieldValue = astFromValue(value[field.name], field.type);
      if (fieldValue) {
        fieldNodes.push({
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: field.name },
          value: fieldValue,
        });
      }
    }
    return { kind: Kind.OBJECT, fields: fieldNodes };
  }

  if (isLeafType(type)) {
    // Since value is an internally represented value, it must be serialized
    // to an externally represented value before converting into an AST.
    const serialized = type.serialize(value);
    if (isNullish(serialized)) {
      return null;
    }

    // Others serialize based on their corresponding JavaScript scalar types.
    if (typeof serialized === 'boolean') {
      return { kind: Kind.BOOLEAN, value: serialized };
    }

    // JavaScript numbers can be Int or Float values.
    if (typeof serialized === 'number') {
      const stringNum = String(serialized);
      return integerStringRegExp.test(stringNum)
        ? { kind: Kind.INT, value: stringNum }
        : { kind: Kind.FLOAT, value: stringNum };
    }

    if (typeof serialized === 'string') {
      // Enum types use Enum literals.
      if (isEnumType(type)) {
        return { kind: Kind.ENUM, value: serialized };
      }

      // ID types can use Int literals.
      if (type === GraphQLID && integerStringRegExp.test(serialized)) {
        return { kind: Kind.INT, value: serialized };
      }

      return {
        kind: Kind.STRING,
        value: serialized,
      };
    }

    /* CUSTOM CODE */

    if (typeof serialized === 'object') {
      if (Array.isArray(serialized)) {
        return {
          kind: Kind.LIST,
          values: serialized.map(v => astFromValue(v, type)),
        };
      }

      return {
        kind: Kind.OBJECT,
        fields: Object.entries(serialized).map(([k, v]) => {
          return {
            kind: 'ObjectField',
            name: { kind: 'Name', value: k },
            value: astFromValue(v, type),
          };
        }),
      };
    }

    /* CUSTOM CODE */

    throw new TypeError(`Cannot convert value to AST: ${inspect(serialized)}`);
  }

  // Not reachable. All possible input types have been considered.
  invariant(false, 'Unexpected input type: ' + inspect(type));
}

/**
 * IntValue:
 *   - NegativeSign? 0
 *   - NegativeSign? NonZeroDigit ( Digit+ )?
 */
const integerStringRegExp = /^-?(?:0|[1-9][0-9]*)$/;
