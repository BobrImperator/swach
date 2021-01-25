import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import FlashMessageService from 'ember-cli-flash/services/flash-messages';
import { Store } from 'ember-orbit';

import { IpcRenderer } from 'electron';
import IDBExportImport from 'indexeddb-export-import';

import { getDBOpenRequest } from 'swach/utils/get-db-open-request';

export default class SettingsDataComponent extends Component {
  @service dataCoordinator: any;
  @service flashMessages!: FlashMessageService;
  @service store!: Store;

  ipcRenderer!: IpcRenderer;

  @tracked isExporting = false;
  @tracked isImporting = false;

  constructor(owner: unknown, args: Record<string, unknown>) {
    super(owner, args);

    if (typeof requireNode !== 'undefined') {
      const { ipcRenderer } = requireNode('electron');
      this.ipcRenderer = ipcRenderer;
    }
  }

  @action
  exportIndexedDB(): void {
    if (this.ipcRenderer) {
      this.isExporting = true;
      const DBOpenRequest = getDBOpenRequest();
      DBOpenRequest.onsuccess = () => {
        const idbDatabase = DBOpenRequest.result;

        IDBExportImport.exportToJsonString(
          idbDatabase,
          (err: Event, jsonString: string) => {
            if (err) {
              this.isExporting = false;
              this.flashMessages.danger('An error occurred.');
              console.error(err);
            } else {
              this.ipcRenderer.send('exportData', jsonString);
              this.flashMessages.success(
                'Export saved to downloads directory.'
              );
              idbDatabase.close();
              this.isExporting = false;
            }
          }
        );
      };
    }
  }

  @action
  importIndexedDB(): void {
    if (this.ipcRenderer) {
      this.isImporting = true;
      this.ipcRenderer.invoke('importData').then((jsonString: string) => {
        if (jsonString) {
          const DBOpenRequest = getDBOpenRequest();
          DBOpenRequest.onsuccess = () => {
            const idbDatabase = DBOpenRequest.result;
            IDBExportImport.clearDatabase(idbDatabase, (err: Event) => {
              if (!err) {
                // cleared data successfully
                IDBExportImport.importFromJsonString(
                  idbDatabase,
                  jsonString,
                  async (err: Event) => {
                    if (!err) {
                      idbDatabase.close();
                      // TODO is pulling from the backup with orbit the best "refresh" here?
                      const backup = this.dataCoordinator.getSource('backup');

                      if (backup) {
                        const transform = await backup.pull((q) =>
                          q.findRecords()
                        );
                        await this.store.sync(transform);
                        this.flashMessages.success(
                          'Data successfully replaced.'
                        );
                      }
                    }

                    this.isImporting = false;
                  }
                );
              }
            });
          };
        } else {
          this.isImporting = false;
        }
      });
    }
  }
}