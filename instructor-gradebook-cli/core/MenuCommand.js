/**
 * ================================================================
 *  MenuCommand — Command Pattern Implementation
 * ================================================================
 *  Pattern  : COMMAND (Behavioral GoF Pattern)
 *  Intent   : Encapsulate a request as an object, thereby allowing
 *             you to parameterise clients with different requests,
 *             queue or log requests, and support undoable operations.
 *
 *  Participants (GoF roles):
 *    Command         → ICommand (abstract base class below)
 *    ConcreteCommand → LoadCommand, FilterCommand, DetailCommand,
 *                      StatsCommand, ExportCommand, HelpCommand, QuitCommand
 *    Invoker         → MenuInvoker (holds and executes commands)
 *    Receiver        → GradeBookApp (the object that does real work)
 *
 *  How it applies here:
 *    Each menu option (1-7) is encapsulated as a Command object.
 *    The MenuInvoker simply calls execute() on whatever command is
 *    registered for that key. Adding a new menu option = adding one
 *    new ConcreteCommand class with no changes to the Invoker.
 *    This perfectly demonstrates the Open/Closed Principle.
 * ================================================================
 */

// ── Abstract Command ──────────────────────────────────────────────
class ICommand {
  /**
   * @param {import('./GradeBookApp')} app  The receiver (GradeBookApp)
   */
  constructor(app) {
    if (new.target === ICommand) {
      throw new Error('[ICommand] Cannot instantiate abstract Command directly.');
    }
    this._app = app;
  }

  /** @abstract */
  async execute(input) {
    throw new Error('[ICommand] execute() must be overridden by every concrete command.');
  }

  /** Human-readable description shown in the help menu */
  get description() { return '(no description)'; }
}

// ── Concrete Command 1: LoadCommand ──────────────────────────────
class LoadCommand extends ICommand {
  get description() { return 'Reload submissions from engine / file'; }

  async execute() {
    await this._app.loadSubmissions();
  }
}

// ── Concrete Command 2: FilterByCourseCommand ─────────────────────
class FilterByCourseCommand extends ICommand {
  get description() { return 'Filter by Course ID'; }

  async execute(input) {
    await this._app.filterByCourse(input);
  }
}

// ── Concrete Command 3: FilterByStatusCommand ─────────────────────
class FilterByStatusCommand extends ICommand {
  get description() { return 'Filter by Status  (ON_TIME / LATE / REJECTED)'; }

  async execute(input) {
    await this._app.filterByStatus(input);
  }
}

// ── Concrete Command 4: FilterByStudentCommand ────────────────────
class FilterByStudentCommand extends ICommand {
  get description() { return 'Search by Student ID'; }

  async execute(input) {
    await this._app.filterByStudent(input);
  }
}

// ── Concrete Command 5: ShowAllCommand ───────────────────────────
class ShowAllCommand extends ICommand {
  get description() { return 'Clear filters — show all submissions'; }

  async execute() {
    await this._app.showAll();
  }
}

// ── Concrete Command 6: DetailCommand ────────────────────────────
class DetailCommand extends ICommand {
  get description() { return 'View full detail of a submission (enter row #)'; }

  async execute(input) {
    await this._app.showDetail(input);
  }
}

// ── Concrete Command 7: StatsCommand ─────────────────────────────
class StatsCommand extends ICommand {
  get description() { return 'Show submission statistics dashboard'; }

  async execute() {
    await this._app.showStats();
  }
}

// ── Concrete Command 8: ExportCommand ────────────────────────────
class ExportCommand extends ICommand {
  get description() { return 'Export current view to CSV file'; }

  async execute(input) {
    await this._app.exportCSV(input);
  }
}

// ── Concrete Command 9: HelpCommand ──────────────────────────────
class HelpCommand extends ICommand {
  get description() { return 'Show this help menu'; }

  async execute() {
    await this._app.showHelp();
  }
}

// ── Concrete Command 10: QuitCommand ─────────────────────────────
class QuitCommand extends ICommand {
  get description() { return 'Exit the GradeBook'; }

  async execute() {
    await this._app.quit();
  }
}

// ── Invoker ───────────────────────────────────────────────────────
/**
 * MenuInvoker holds a registry of commands keyed by menu letter/number.
 * It decouples the input handler from the actual command logic.
 * (GoF: Invoker role in Command Pattern)
 */
class MenuInvoker {
  constructor() {
    /** @type {Map<string, ICommand>} */
    this._commands = new Map();
  }

  /**
   * Register a command under a menu key.
   * @param {string}   key      - Single-char menu key (e.g. '1', 'q')
   * @param {ICommand} command
   */
  register(key, command) {
    this._commands.set(key.toLowerCase(), command);
  }

  /**
   * Execute the command for the given key.
   * @param {string} key
   * @param {string} input  - Optional additional input from user
   */
  async invoke(key, input = '') {
    const cmd = this._commands.get(key.toLowerCase());
    if (!cmd) {
      console.log(`\x1b[33m  Unknown option: "${key}". Press 'h' for help.\x1b[0m`);
      return;
    }
    await cmd.execute(input.trim());
  }

  /** Return all registered commands for help display */
  getRegistry() {
    return this._commands;
  }
}

module.exports = {
  ICommand,
  LoadCommand,
  FilterByCourseCommand,
  FilterByStatusCommand,
  FilterByStudentCommand,
  ShowAllCommand,
  DetailCommand,
  StatsCommand,
  ExportCommand,
  HelpCommand,
  QuitCommand,
  MenuInvoker,
};
