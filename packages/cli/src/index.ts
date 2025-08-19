#!/usr/bin/env node

import { Command } from 'commander';
import { serveCommand } from './commands/serve';

const program = new Command();

program
  .name('wingman')
  .description('CLI for Wingman - UX feedback assistant')
  .version('1.0.0');

program.addCommand(serveCommand);

program.parse();
