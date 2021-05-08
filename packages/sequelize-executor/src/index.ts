import { Op, Sequelize } from 'sequelize';
export const SequelizeExecutor = (SQ: Sequelize) => {
  const strategies = {
    find: params => {
      return SQ.model(params.collection)
        .findAll({
          where: params.selector,
          attributes: params.fields,
          limit: params.options.limit,
          offset: params.options.skip,
          order:
            params.options.sort &&
            Object.entries(params.options.sort).map(([key, value]) => [
              key,
              value === 1 ? 'ASC' : 'DESC',
            ]),
        })
        .then(res => res?.map(item => item.get({ plain: true })));
    },
    findOne: params => {
      return SQ.model(params.collection)
        .findOne({
          where: params.selector,
          attributes: params.fields,
          limit: params.options.limit,
          offset: params.options.skip,
        })
        .then(res => res?.get({ plain: true }));
    },
    insertOne: params => {
      return SQ.model(params.collection)
        .create(params.doc)
        .then(res => res?.get({ plain: true }));
    },
    updateOne: params => {
      return SQ.model(params.collection)
        .update(params.doc['$set'], { where: params.selector, returning: true })
        .then(([, res]) => res?.[0]?.get({ plain: true }));
    },
    deleteOne: async params => {
      const item = await SQ.model(params.collection)
        .findOne({
          where: params.selector,
          attributes: params.fields,
        })
        .then(res => res?.get({ plain: true }));

      await SQ.model(params.collection).destroy({ where: params.selector });

      return item;
    },
    aggregate: async params => {
      return {
        aggregate: {
          count: await SQ.model(params.collection).count({
            where: params.selector,
            // limit: params.options.limit,
            // offset: params.options.skip,
          }),
        },
      };
    },
  };

  const mapSelectorKeys = {
    $in: Op.in,
    $or: Op.or,
    $and: Op.and,
    $not: Op.not,
    $eq: Op.eq,
    $lt: Op.lt,
    $lte: Op.lte,
    $gt: Op.gt,
    $gte: Op.gte,
    $regex: Op.regexp,
  };

  const mapSelector = selector => {
    if (Array.isArray(selector)) return selector.map(mapSelector);
    if (typeof selector !== 'object') return selector;

    return Object.fromEntries(
      Object.entries(selector ?? {}).map(([key, value]) => {
        if (key === '$regex') {
          const regex = value.toString();
          return [mapSelectorKeys[key], regex.substring(1, regex.length - 1)];
        }
        return [mapSelectorKeys[key] ?? key, mapSelector(value)];
      })
    );
  };

  const executor = async params => {
    const mappedSelector = params?.selector
      ? mapSelector(params.selector)
      : undefined;

    return strategies[params.type]({
      ...params,
      selector: mappedSelector,
    });
  };

  return executor;
};

export default SequelizeExecutor;
