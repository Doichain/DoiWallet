module.exports = {
  testEnvironment: '<rootDir>/tests/custom-environment.js',
  reporters: ['default', ['<rootDir>/tests/custom-reporter.js', {}]],
  preset: '@react-native/jest-preset',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  // @react-navigation, @scure/base and @noble/secp256k1 3 ship ES modules, so they have to be transformed too
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native(-.*)?|@react-native(-community)?)|@react-navigation|@scure|@noble|silent-payments/)',
  ],
  moduleNameMapper: {
    '^@react-native-vector-icons/(.*)$': '<rootDir>/tests/mocks/vector-icons.js',
    '^react-native-svg$': '<rootDir>/tests/mocks/react-native-svg.js',
  },
  setupFiles: ['./tests/setup.js'],
  watchPathIgnorePatterns: ['<rootDir>/node_modules'],
};
