type QueryResult<T = unknown> = {
  data: T;
  error: unknown;
};

type QueryResults = {
  single?: QueryResult;
  maybeSingle?: QueryResult;
  list?: QueryResult;
  insert?: QueryResult;
};

export type SupabaseQueryMock = {
  select: jest.Mock;
  eq: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  insert: jest.Mock;
};

const tableQueries = new Map<string, SupabaseQueryMock>();

export const getUserMock = jest.fn();
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
};

export function createQueryMock(results: QueryResults = {}): SupabaseQueryMock {
  const success = { data: null, error: null };
  const query = {} as SupabaseQueryMock;

  query.select = jest.fn(() => query);
  query.eq = jest.fn(() => query);
  query.order = jest.fn(() => query);
  query.limit = jest.fn().mockResolvedValue(results.list ?? success);
  query.single = jest.fn().mockResolvedValue(results.single ?? success);
  query.maybeSingle = jest
    .fn()
    .mockResolvedValue(results.maybeSingle ?? success);
  query.insert = jest.fn().mockResolvedValue(results.insert ?? success);

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
  getPublicUrlMock.mockImplementation((path: string) => ({
    data: { publicUrl: `https://storage.test/${path}` },
  }));
}
