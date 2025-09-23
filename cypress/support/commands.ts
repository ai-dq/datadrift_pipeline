export {}; // Ensure this file is treated as a module for type augmentation

type AuthUser = {
  id: number;
  email: string;
  username: string;
  [key: string]: unknown;
};

const AUTH_WHOAMI_PATH = '/next-api/external/api/current-user/whoami';
const DIRECT_LOGIN_PATH = '/next-api/external/user/login/';
const CSRF_PATH = '/next-api/external/user/login';
const TOKEN_OBTAIN_PATH = '/next-api/external/api/token/obtain/';
const LOGOUT_PATH = '/next-api/external/logout';

const DEFAULT_AUTH_USER: AuthUser = {
  id: 1,
  email: 'admin@example.com',
  username: 'admin',
};

declare global {
  namespace Cypress {
    interface Chainable {
      mockAuthUser(
        overrides?: Partial<AuthUser>,
        alias?: string,
      ): Chainable<null>;
      mockAuthUnauthorized(alias?: string): Chainable<null>;
      setAuthCookies(cookies?: Record<string, string>): Chainable<null>;
      stubCsrfToken(token?: string, alias?: string): Chainable<null>;
      stubDirectLogin(
        statusCode?: number,
        options?: {
          alias?: string;
          body?: unknown;
          headers?: Record<string, string>;
        },
      ): Chainable<null>;
      stubTokenObtain(
        statusCode?: number,
        options?: {
          alias?: string;
          body?: unknown;
        },
      ): Chainable<null>;
      stubLogout(statusCode?: number, alias?: string): Chainable<null>;
    }
  }
}

Cypress.Commands.add(
  'mockAuthUser',
  (overrides: Partial<AuthUser> = {}, alias = 'whoami') => {
    cy.intercept('GET', AUTH_WHOAMI_PATH, {
      statusCode: 200,
      body: { ...DEFAULT_AUTH_USER, ...overrides },
    }).as(alias);
  },
);

Cypress.Commands.add('mockAuthUnauthorized', (alias = 'whoami') => {
  cy.intercept('GET', AUTH_WHOAMI_PATH, {
    statusCode: 401,
    body: { detail: 'Unauthorized' },
  }).as(alias);
});

Cypress.Commands.add(
  'setAuthCookies',
  (cookies: Record<string, string> = {}) => {
    const defaults: Record<string, string> = {
      csrftoken: 'csrfToken123',
      sessionid: 'sessionToken123',
    };

    Object.entries({ ...defaults, ...cookies }).forEach(([name, value]) => {
      cy.setCookie(name, value);
    });
  },
);

Cypress.Commands.add(
  'stubCsrfToken',
  (token = 'csrfToken123', alias = 'csrf') => {
    cy.intercept('GET', CSRF_PATH, (req) => {
      req.reply({
        statusCode: 200,
        headers: {
          'set-cookie': `csrftoken=${token}; Path=/; HttpOnly`,
          'content-type': 'text/html',
        },
        body: '<html></html>',
      });
    }).as(alias);
  },
);

Cypress.Commands.add(
  'stubDirectLogin',
  (
    statusCode = 200,
    options: {
      alias?: string;
      body?: unknown;
      headers?: Record<string, string>;
    } = {},
  ) => {
    const {
      alias = 'login',
      body = {},
      headers = {
        'set-cookie': 'sessionid=sessionToken123; Path=/; HttpOnly',
      },
    } = options;
    cy.intercept('POST', DIRECT_LOGIN_PATH, {
      statusCode,
      body,
      headers,
    }).as(alias);
  },
);

Cypress.Commands.add(
  'stubTokenObtain',
  (statusCode = 200, options: { alias?: string; body?: unknown } = {}) => {
    const {
      alias = 'token',
      body = { access: 'access-token', refresh: 'refresh-token' },
    } = options;
    cy.intercept('POST', TOKEN_OBTAIN_PATH, {
      statusCode,
      body,
    }).as(alias);
  },
);

Cypress.Commands.add('stubLogout', (statusCode = 204, alias = 'logout') => {
  cy.intercept('POST', LOGOUT_PATH, {
    statusCode,
    body: {},
  }).as(alias);
});
