type QueryResult<T = unknown> = {
  data: T;
  error: unknown;
};

type QueryResults = {
  single?: QueryResult;
  maybeSingle?: QueryResult;
  list?: QueryResult;
  insert?: QueryResult;
  update?: QueryResult;
};

export type SupabaseQueryMock = {
  then: jest.Mock;
  select: jest.Mock;
  eq: jest.Mock;
  in: jest.Mock;
  ilike: jest.Mock;
  or: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
};

const tableQueries = new Map<string, SupabaseQueryMock>();

export const getUserMock = jest.fn();
export const rpcMock = jest.fn();
export const getPublicUrlMock = jest.fn();
export const storageFromMock = jest.fn(() => ({
  getPublicUrl: getPublicUrlMock,
}));
export const fromMock = jest.fn((table: string) => {
  const query = tableQueries.get(table);
  if (!query) throw new Error(`No Supabase mock registered for ${table}`);
  return query;
});

export const supabase = {
  auth: { getUser: getUserMock },
  storage: { from: storageFromMock },
  from: fromMock,
  rpc: rpcMock,
};

export function createQueryMock(results: QueryResults = {}): SupabaseQueryMock {
  const success = { data: null, error: null };
  let result = results.list ?? success;
  const query = {} as SupabaseQueryMock;
  const chain = () => query;

  query.then = jest.fn((resolve, reject) =>
    Promise.resolve(result).then(resolve, reject),
  );
  query.select = jest.fn(chain);
  query.eq = jest.fn(chain);
  query.in = jest.fn(chain);
  query.ilike = jest.fn(chain);
  query.or = jest.fn(chain);
  query.order = jest.fn(chain);
  query.limit = jest.fn(chain);
  query.single = jest.fn().mockResolvedValue(results.single ?? success);
  query.maybeSingle = jest
    .fn()
    .mockResolvedValue(results.maybeSingle ?? success);
  query.insert = jest.fn(() => {
    result = results.insert ?? success;
    return query;
  });
  query.update = jest.fn(() => {
    result = results.update ?? success;
    return query;
  });

  return query;
}

export function registerTableQuery(
  table: string,
  query: SupabaseQueryMock,
): void {
  tableQueries.set(table, query);
}

export function resetSupabaseMock(): void {
  jest.clearAllMocks();
  tableQueries.clear();
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
  rpcMock.mockResolvedValue({ data: null, error: null });
  getPublicUrlMock.mockImplementation((path: string) => ({
    data: { publicUrl: `https://storage.test/${path}` },
  }));
}
