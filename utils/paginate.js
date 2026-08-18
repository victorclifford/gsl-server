/**
 * Utility function to paginate Mongoose queries
 * @param {import('mongoose').Model} model - The Mongoose model to query
 * @param {Object} query - The database query filters
 * @param {Object} options - Pagination options (page, limit, sort, populate)
 * @returns {Promise<{data: Array, pagination: {total: number, page: number, limit: number, pages: number}}>}
 */
const paginate = async (model, query = {}, options = {}) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 10;
  const skip = (page - 1) * limit;

  const total = await model.countDocuments(query);
  
  let dbQuery = model.find(query).skip(skip).limit(limit);

  if (options.sort) {
    dbQuery = dbQuery.sort(options.sort);
  } else {
    dbQuery = dbQuery.sort({ createdAt: -1 });
  }

  if (options.populate) {
    dbQuery = dbQuery.populate(options.populate);
  }

  const data = await dbQuery.exec();

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

module.exports = paginate;
