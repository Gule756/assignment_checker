#!/usr/bin/env node
/**
 * ================================================================
 *  gradebook.js — Instructor GradeBook CLI Entry Point
 * ================================================================
 *  Subsystem 3: Instructor Grade-Book Desk
 *  Platform   : Node.js Terminal (standalone CLI app)
 *  Run with   : node gradebook.js
 *
 *  Architecture:
 *    This file is the INVOKER in the Command Pattern.
 *    It reads user input line-by-line via Node.js built-in
 *    `readline`, parses the command token, and delegates to
 *    MenuInvoker which dispatches the correct Command object.
 *
 *  Design Patterns active in this file:
 *    • Command  — MenuInvoker dispatches ICommand objects
 *    • Singleton— GradeBookApp.getInstance() is called once
 *    • Facade   — GradeBookApp.loadSubmissions() hides complexity
 *    • Strategy — FilterContext swaps filter algorithm at runtime
 * ================================================================
 */

const readline = require('readline');
const GradeBookApp = require('./core/GradeBookApp');
const {
  LoadCommand, FilterByCourseCommand, FilterByStatusCommand,
  FilterByStudentCommand, ShowAllCommand, DetailCommand,
  StatsCommand, ExportCommand, HelpCommand, QuitCommand,
  MenuInvoker,
} = require('./core/MenuCommand');

// ANSI helpers
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', cyan: '\x1b[36m',
  green: '\x1b[32m', yellow: '\x1b[33m', dim: '\x1b[2m',
  magenta: '\x1b[35m', blue: '\x1b[34m',
};

// ─────────────────────────────────────────────────────────────────
//  BOOT BANNER
// ─────────────────────────────────────────────────────────────────
function printBanner() {
  console.clear();
  console.log(C.cyan + C.bold);
  console.log('  ╔══════════════════════════════════════════════════════╗');
  console.log('  ║                                                      ║');
  console.log('  ║   📋  INSTRUCTOR GRADE-BOOK DESK  v1.0              ║');
  console.log('  ║       Digital Assignment Receipt Validation Grid     ║');
  console.log('  ║                                                      ║');
  console.log('  ║   Subsystem 3 — Node.js Terminal Application        ║');
  console.log('  ║   Design Patterns: Singleton · Facade · Command     ║');
  console.log('  ║                    Strategy · Observer              ║');
  console.log('  ╚══════════════════════════════════════════════════════╝');
  console.log(C.reset);
  console.log(`  ${C.dim}Press 'h' for help, 'q' to quit.${C.reset}\n`);
}

// ─────────────────────────────────────────────────────────────────
//  COMMAND PROMPT
// ─────────────────────────────────────────────────────────────────
function printPrompt() {
  process.stdout.write(`${C.cyan}${C.bold}gradebook>${C.reset} `);
}

// ─────────────────────────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────────────────────────
async function main() {
  printBanner();

  // ── Singleton: get the ONE app instance ──────────────────────
  const app = GradeBookApp.getInstance();

  // ── Command Pattern: register all commands with the Invoker ──
  const invoker = new MenuInvoker();

  invoker.register('r',      new LoadCommand(app));
  invoker.register('reload', new LoadCommand(app));
  invoker.register('fc',     new FilterByCourseCommand(app));
  invoker.register('fs',     new FilterByStatusCommand(app));
  invoker.register('ss',     new FilterByStudentCommand(app));
  invoker.register('all',    new ShowAllCommand(app));
  invoker.register('d',      new DetailCommand(app));
  invoker.register('detail', new DetailCommand(app));
  invoker.register('stats',  new StatsCommand(app));
  invoker.register('export', new ExportCommand(app));
  invoker.register('h',      new HelpCommand(app));
  invoker.register('help',   new HelpCommand(app));
  invoker.register('q',      new QuitCommand(app));
  invoker.register('quit',   new QuitCommand(app));
  invoker.register('exit',   new QuitCommand(app));

  // ── Auto-load on startup ─────────────────────────────────────
  await app.loadSubmissions();

  // ── readline interface for interactive input ─────────────────
  const rl = readline.createInterface({
    input:  process.stdin,
    output: process.stdout,
    terminal: false,
  });

  printPrompt();

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) { printPrompt(); return; }

    // Parse: first token = command key, rest = argument
    const parts = trimmed.split(/\s+/);
    const key   = parts[0].toLowerCase();
    const arg   = parts.slice(1).join(' ');

    // Dispatch through the Command Pattern Invoker
    await invoker.invoke(key, arg);

    printPrompt();
  });

  rl.on('close', () => {
    console.log(`\n  ${C.cyan}Session ended.${C.reset}\n`);
    process.exit(0);
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log(`\n\n  ${C.yellow}Interrupted. Exiting GradeBook.${C.reset}\n`);
    process.exit(0);
  });
}

main().catch(err => {
  console.error(`\x1b[31m[FATAL] ${err.message}\x1b[0m`);
  process.exit(1);
});
