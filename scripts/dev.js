#!/usr/bin/env node

process.env.DEBUG = 'slack-opsgenie-bot:*';
process.env.NODE_ENV = 'development';

require('ts-node').register({
  project: require('path').join(__dirname, '../tsconfig.json'),
});

require('tsconfig-paths/register');

// Start the server
require('../src/index.ts');
