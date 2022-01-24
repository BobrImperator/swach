import Route from '@ember/routing/route';
import { service } from '@ember/service';

import CognitoService from 'ember-cognito/services/cognito';
import Session from 'ember-simple-auth/services/session';

export default class SettingsAccountRoute extends Route {
  @service cognito!: CognitoService;
  @service session!: Session;

  model(): CognitoService['user']['attributes'] {
    console.log(this.cognito);
    return this.cognito.user?.attributes;
  }
}
