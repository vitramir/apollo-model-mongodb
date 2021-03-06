import {
  GraphQLInputObjectType,
  GraphQLInputType,
  IntrospectionInputObjectType,
  IntrospectionNamedTypeRef,
  IntrospectionObjectType,
  isEnumType,
  isListType,
  isNonNullType,
  isScalarType,
} from 'graphql';
import isObject from 'lodash/isObject';
import * as R from 'ramda';
import {
  CREATE,
  DELETE,
  GET_LIST,
  GET_MANY,
  GET_MANY_REFERENCE,
  GET_ONE,
  UPDATE,
} from 'react-admin';
import { IntrospectionResultData, Resource } from './definitions';
import { IntrospectionResult } from './introspectionResult';

interface GetListParams {
  filter: { [key: string]: any };
  pagination: { page: number; perPage: number };
  sort: { field: string; order: string };
}

//TODO: Object filter weren't tested yet
const buildGetListVariables = (
  introspectionResults: IntrospectionResultData
) => (resource: Resource, aorFetchType: string, params: GetListParams) => {
  const filter = Object.keys(params.filter).reduce((acc, key) => {
    if (key === 'ids') {
      return { ...acc, id_in: params.filter[key] };
    }

    if (Array.isArray(params.filter[key])) {
      const type = introspectionResults.types.find(
        t => t.name === `${resource.type.name}WhereInput`
      ) as IntrospectionInputObjectType;
      const inputField = type.inputFields.find((t: any) => t.name === key);

      if (!!inputField) {
        return {
          ...acc,
          [key]: params.filter[key],
        };
      }
    }

    if (isObject(params.filter[key])) {
      const type = introspectionResults.types.find(
        t => t.name === `${resource.type.name}WhereInput`
      ) as IntrospectionInputObjectType;
      const filterSome = type.inputFields.find(
        (t: any) => t.name === `${key}_some`
      );

      if (filterSome) {
        const filter = Object.keys(params.filter[key]).reduce(
          (acc, k: string) => ({
            ...acc,
            [`${k}_in`]: params.filter[key][k] as string[],
          }),
          {} as { [key: string]: string[] }
        );
        return { ...acc, [`${key}_some`]: filter };
      }
    }

    const parts = key.split('.');

    if (parts.length > 1) {
      if (parts[1] == 'id') {
        const type = introspectionResults.types.find(
          t => t.name === `${resource.type.name}WhereInput`
        ) as IntrospectionInputObjectType;
        const filterSome = type.inputFields.find(
          (t: any) => t.name === `${parts[0]}_some`
        );

        if (filterSome) {
          return {
            ...acc,
            [`${parts[0]}_some`]: { id: params.filter[key] },
          };
        }

        return { ...acc, [parts[0]]: { id: params.filter[key] } };
      }

      const resourceField = (resource.type as IntrospectionObjectType).fields.find(
        (f: any) => f.name === parts[0]
      );
      if ((resourceField.type as IntrospectionNamedTypeRef).name === 'Int') {
        return { ...acc, [key]: parseInt(params.filter[key]) };
      }
      if ((resourceField.type as IntrospectionNamedTypeRef).name === 'Float') {
        return { ...acc, [key]: parseFloat(params.filter[key]) };
      }
    }

    return { ...acc, [key]: params.filter[key] };
  }, {});

  return {
    skip: (params.pagination.page - 1) * params.pagination.perPage,
    first: params.pagination.perPage,
    orderBy: `${params.sort.field}_${params.sort.order}`,
    where: filter,
  };
};

interface UpdateParams {
  id: string;
  data: { [key: string]: any };
  previousData: { [key: string]: any };
}

function transformInput(value, type: GraphQLInputType) {
  if (isNonNullType(type)) {
    return transformInput(value, type.ofType);
  }

  if (isListType(type)) {
    return value.map(v => transformInput(v, type.ofType));
  }

  if (isScalarType(type) || isEnumType(type)) {
    return value;
  }

  if (
    type.name.endsWith('UpdateOneRelationInput') ||
    type.name.endsWith('CreateOneRelationInput') ||
    type.name.endsWith('CreateOneRequiredRelationInput') ||
    type.name.endsWith('CreateManyRelationInput')
  ) {
    if (value === null) return null;
    return transformInputObject({ connect: value }, type);
  }

  if (type.name.endsWith('UpdateManyRelationInput')) {
    if (value === null) return null;
    return transformInputObject({ reconnect: value }, type);
  }

  if (
    type.name.endsWith('UpdateOneNestedInput') ||
    type.name.endsWith('CreateOneNestedInput') ||
    type.name.endsWith('CreateManyNestedInput')
  ) {
    if (value === null) return null;
    return transformInputObject({ create: value }, type);
  }

  if (type.name.endsWith('UpdateManyNestedInput')) {
    if (value === null) return null;
    return transformInputObject({ recreate: value }, type);
  }

  if (
    type.name.endsWith('InterfaceWhereUniqueInput') ||
    type.name.endsWith('InterfaceWhereInput')
  ) {
    const { __typename, ...restValue } = value;
    let typeName = __typename;
    if (!typeName) {
      typeName = Object.keys(type.getFields()).filter(
        key => key !== 'aclWhere'
      )[0];
    }
    return transformInputObject({ [typeName]: restValue }, type);
  }

  if (
    type.name.endsWith('InterfaceCreateInput') ||
    type.name.endsWith('InterfaceUpdateInput')
  ) {
    const { __typename, ...restValue } = value;
    return transformInputObject({ [__typename]: restValue }, type);
  }

  if (
    type.name.endsWith('WhereUniqueInput') ||
    type.name.endsWith('WhereInput') ||
    type.name.endsWith('CreateInput') ||
    type.name.endsWith('UpdateInput') ||
    type.name.endsWith('GeoJSONPointInput') ||
    type.name.endsWith('GeoJSONPolygonInput')
  ) {
    return transformInputObject(value, type);
  }
}

function transformInputObject(
  data: { [key: string]: any },
  type: GraphQLInputObjectType
) {
  return Object.entries(data).reduce((acc, [key, value]) => {
    try {
      const field = type.getFields()[key];

      if (!field) {
        return acc;
      }

      const resultValue = transformInput(value, field.type);

      if (resultValue !== undefined) {
        return {
          ...acc,
          [key]: resultValue,
        };
      } else {
        return acc;
      }
    } catch (err) {
      console.error(
        `Error during transformation of "${key}" field. Value: ${JSON.stringify(
          value
        )}. Error: ${err.toString()}`
      );
      return acc;
    }
  }, {} as { [key: string]: any });
}

const buildUpdateVariables = (
  introspectionResults: IntrospectionResultData,
  introspection: IntrospectionResult
) => (resource: Resource, aorFetchType: string, params: UpdateParams) => {
  // const type = R.find(R.propEq('name', resource.type.name))(
  //   introspectionResults.types
  // ) as IntrospectionObjectType;

  const updateDataType = introspection.getUpdateType(
    resource.type.name,
    'data'
  );
  const updateWhereType = introspection.getUpdateType(
    resource.type.name,
    'where'
  );
  const { id, ...restData } = params.data;

  const where = transformInput(
    {
      id,
      __typename: restData.__typename,
    },
    updateWhereType
  );
  const data = transformInput(restData, updateDataType);

  return {
    where,
    data,
  };
};

interface CreateParams {
  data: { [key: string]: any };
}

const buildCreateVariables = (
  introspectionResults: IntrospectionResultData,
  introspection: IntrospectionResult
) => (resource: Resource, aorFetchType: string, params: UpdateParams) => {
  // const type = R.find(R.propEq('name', resource.type.name))(
  //   introspectionResults.types
  // ) as IntrospectionObjectType;

  const createType = introspection.getCreateDataType(resource.type.name);

  const data = transformInput(params.data, createType);

  return {
    data,
  };
};

const renameKey = R.curry((oldKey, newKey, obj) =>
  R.assoc(newKey, R.prop(oldKey, obj), R.dissoc(oldKey, obj))
);

export default (
  introspectionResults: IntrospectionResultData,
  introspection: IntrospectionResult
) => (resource: Resource, aorFetchType: string, params: any) => {
  switch (aorFetchType) {
    case GET_LIST: {
      return buildGetListVariables(introspectionResults)(
        resource,
        aorFetchType,
        params
      );
    }
    case GET_MANY:
      if (introspection) {
        const getManyType = introspection.getGetManyWhereType(
          resource.type.name
        );
        const paramsIdsToIdIn = params.ids
          ? renameKey('ids', 'id_in', params)
          : params;
        const getManyWhere = transformInput(paramsIdsToIdIn, getManyType);
        return {
          where: getManyWhere,
        };
      } else {
        return {
          where: { id_in: params.ids },
        };
      }
    case GET_MANY_REFERENCE: {
      const parts = params.target.split('.');

      return {
        where: { [parts[0]]: { id: params.id } },
      };
    }
    case GET_ONE:
      const getOneType = introspection.getGetOneWhereType(resource.type.name);
      const getOneWhere = transformInput(params, getOneType);
      return {
        where: getOneWhere,
      };
    case UPDATE: {
      return buildUpdateVariables(introspectionResults, introspection)(
        resource,
        aorFetchType,
        params
      );
    }

    case CREATE: {
      return buildCreateVariables(introspectionResults, introspection)(
        resource,
        aorFetchType,
        params
      );
    }

    case DELETE:
      if (introspection) {
        const deleteType = introspection.getGetOneWhereType(resource.type.name);
        const deleteWhere = transformInput(params, deleteType);
        return {
          where: deleteWhere,
        };
      } else {
        return {
          where: { id: params.id },
        };
      }
  }
};
