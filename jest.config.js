/* eslint-disable tsdoc/syntax, unicorn/prefer-module, no-undef */

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__test__'],
  testRegex: '/__test__/.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { diagnostics: false }],
  },
}
