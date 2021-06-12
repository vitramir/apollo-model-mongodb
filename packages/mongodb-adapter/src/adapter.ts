import { DataSourceAdapter } from '@graphex/abstract-datasource-adapter';
import { Db } from 'mongodb';
import { head } from 'ramda';

import { reduceSelector } from './reduceSelector';

type CreateAdapter = (db: Db) => DataSourceAdapter;

export const createMongoAdapter: CreateAdapter = db => {
  const adapter: DataSourceAdapter = {
    async findOne(params) {
      return db
        .collection(params.collectionName)
        .findOne(reduceSelector(params.selector));
    },
    async findMany(params) {
      let cursor = db
        .collection(params.collectionName)
        .find(reduceSelector(params.selector));
      if (params?.skip) cursor = cursor.skip(params.skip);
      if (params?.limit) cursor = cursor.limit(params.limit);
      if (params?.sort) cursor = cursor.sort(params.sort);
      return cursor.toArray();
    },
    async insertOne(params) {
      return db
        .collection(params.collectionName)
        .insertOne(params.doc)
        .then(res => head(res.ops));
    },
    async insertMany(params) {
      return db
        .collection(params.collectionName)
        .insertMany(params.docs)
        .then(res => res.ops);
    },
    async updateOne(params) {
      return db
        .collection(params.collectionName)
        .findOneAndUpdate(reduceSelector(params.selector), params.doc, {
          returnOriginal: false,
          arrayFilters: params.arrayFilters,
        })
        .then(res => res.value);
    },
    async deleteOne(params) {
      return db
        .collection(params.collectionName)
        .findOneAndDelete(reduceSelector(params.selector))
        .then(res => res.value);
    },
    async deleteMany(params) {
      return db
        .collection(params.collectionName)
        .deleteMany(reduceSelector(params.selector))
        .then(res => res.deletedCount);
    },
    async aggregate(params) {
      return [
        {
          count: await db
            .collection(params.collectionName)
            .find(reduceSelector(params.selector))
            .count(true),
        },
      ];
    },
  };
  return adapter;
};
