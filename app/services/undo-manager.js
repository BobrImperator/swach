import Service from '@ember/service';
import { inject as service } from '@ember/service';

function removeFromTo(array, from, to) {
  array.splice(
    from,
    !to ||
      1 +
        to -
        from +
        (!((to < 0) ^ (from >= 0)) && (to < 0 || -1) * array.length)
  );
  return array.length;
}

export default class UndoManager extends Service {
  @service store;

  callback = null;
  commands = [];
  index = -1;
  isExecuting = false;
  limit = 0;

  constructor() {
    super(...arguments);

    this.undoListener = async (e) => {
      {
        const key = e.which || e.keyCode;
        // testing for CMD or CTRL
        const ctrl =
          e.ctrlKey || e.metaKey
            ? e.ctrlKey || e.metaKey
            : key === 17
            ? true
            : false;
        const isUndo = ctrl && key === 90;
        const isRedo = isUndo && e.shiftKey;
  
        if (isRedo) {
          if (!this.isExecuting && this.hasRedo()) {
            await this.redo();
          }
        } else if (isUndo) {
          if (!this.isExecuting && this.hasUndo()) {
            await this.undo();
          }
        }
      }
    };
    
    document.addEventListener('keydown', this.undoListener, true);
  }

  willDestroy() {
    super.willDestroy(...arguments);

    document.removeEventListener('keydown', this.undoListener, true);
  }

  async execute(command, action) {
    if (!command || typeof command[action] !== 'function') {
      return this;
    }
    this.isExecuting = true;

    const executed = await command[action]();

    this.isExecuting = false;
    return executed;
  }

  /**
   * Add a command to the queue.
   */
  async add(command) {
    if (this.isExecuting) {
      return this;
    }
    // if we are here after having called undo,
    // invalidate items higher on the stack
    this.commands.splice(this.index + 1, this.commands.length - this.index);

    this.commands.push(command);

    // if limit is set, remove items from the start
    if (this.limit && this.commands.length > this.limit) {
      removeFromTo(this.commands, 0, -(this.limit + 1));
    }

    // set the current index to the end
    this.index = this.commands.length - 1;
    if (this.callback) {
      await this.callback();
    }
    return this;
  }

  /**
   * Pass a function to be called on undo and redo actions.
   */
  setCallback(callbackFunc) {
    this.callback = callbackFunc;
  }

  /**
   * Perform undo: call the undo function at the current index and decrease the index by 1.
   */
  async undo() {
    const command = this.commands[this.index];
    if (!command) {
      return this;
    }
    const executed = await this.execute(command, 'undo');
    this.index -= 1;
    if (this.callback) {
      this.callback();
    }
    return executed;
  }

  /*
            Perform redo: call the redo function at the next index and increase the index by 1.
            */
  async redo() {
    const command = this.commands[this.index + 1];
    if (!command) {
      return this;
    }
    const executed = await this.execute(command, 'redo');
    this.index += 1;
    if (this.callback) {
      this.callback();
    }
    return executed;
  }

  /**
   * Clears the memory, losing all stored states. Reset the index.
   */
  clear() {
    const prev_size = this.commands.length;

    this.commands = [];
    this.index = -1;

    if (this.callback && prev_size > 0) {
      this.callback();
    }
  }

  hasUndo() {
    return this.index !== -1;
  }

  hasRedo() {
    return this.index < this.commands.length - 1;
  }

  getCommands() {
    return this.commands;
  }

  getIndex() {
    return this.index;
  }

  setLimit(l) {
    this.limit = l;
  }

  setupUndoRedo() {
    const transformId = this.store.transformLog.head;
    const redoTransform = this.store.getTransform(transformId).operations;
    const undoTransform = this.store.getInverseOperations(transformId);

    const undo = async () => {
      await this.store.update(undoTransform);
    };

    const redo = async () => {
      await this.store.update(redoTransform);
    };

    this.add({ undo, redo });
  }
}
