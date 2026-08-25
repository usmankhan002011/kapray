module.exports = {
  preset: "jest-expo",
  clearMocks: true,
  cacheDirectory: "<rootDir>/node_modules/.cache/jest-services",
  moduleNameMapper: {
    "^@/utils/supabase/client$":
      "<rootDir>/services/__tests__/supabaseClientMock.ts",
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["<rootDir>/services/**/__tests__/**/*.test.ts"],
};
