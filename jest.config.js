module.exports = {
  preset: "jest-expo",
  clearMocks: true,
  cacheDirectory: "<rootDir>/node_modules/.cache/jest-buyer",
  moduleNameMapper: {
    "^@/utils/supabase/client$":
      "<rootDir>/services/buyer/__tests__/supabaseClientMock.ts",
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["<rootDir>/services/buyer/__tests__/**/*.test.ts"],
};
