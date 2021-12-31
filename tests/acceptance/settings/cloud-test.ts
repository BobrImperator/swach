import { click, currentURL, fillIn, visit } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';
import { module, test } from 'qunit';

import { mockCognitoUser } from 'ember-cognito/test-support';
import resetStorages from 'ember-local-storage/test-support/reset-storage';

import sinon from 'sinon';

import { waitForAll } from 'swach/tests/helpers';
import seedOrbit from 'swach/tests/orbit/seed';

module('Acceptance | settings/cloud', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(async function () {
    await seedOrbit(this.owner);
  });

  hooks.afterEach(function () {
    resetStorages();
  });

  test('visiting /settings/cloud', async function (assert) {
    await visit('/settings/cloud/login');

    assert.strictEqual(currentURL(), '/settings/cloud/login');
  });

  test('user can login', async function (assert) {
    await mockCognitoUser({
      username: 'testuser@gmail.com',
      attributes: {
        sub: 'aaaabbbb-cccc-dddd-eeee-ffffgggghhhh',
        email: 'testuser@gmail.com',
        email_verified: 'false'
      }
    });
    const authenticator = this.owner.lookup('authenticator:cognito');
    sinon.stub(authenticator, 'authenticate').resolves();

    await visit('/settings/cloud/login');
    await fillIn('[data-test-login-input-user]', 'testuser@gmail.com');
    await fillIn('[data-test-login-input-password]', 'password');
    await click('[data-test-login-submit]');
    await waitForAll();

    assert.strictEqual(currentURL(), '/settings/cloud/profile');
    assert
      .dom('[data-test-profile-detail="email"]')
      .hasText('testuser@gmail.com');
  });
});
