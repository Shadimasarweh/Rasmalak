import app from './app';
import common from './common';
import nav from './nav';
import dashboard from './dashboard';
import transactions from './transactions';
import categories from './categories';
import settings from './settings';
import auth from './auth';
import learn from './learn';
import chat from './chat';
import tools from './tools';
import onboarding from './onboarding';

// Flatten all domain messages into a single object with prefixed keys
function flatten(obj: Record<string, string>, prefix: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key in obj) {
    result[`${prefix}.${key}`] = obj[key];
  }
  return result;
}

const messages: Record<string, string> = {
  ...flatten(app, 'app'),
  ...flatten(common, 'common'),
  ...flatten(nav, 'nav'),
  ...flatten(dashboard, 'dashboard'),
  ...flatten(transactions, 'transactions'),
  ...flatten(categories, 'categories'),
  ...flatten(settings, 'settings'),
  ...flatten(auth, 'auth'),
  ...flatten(learn, 'learn'),
  ...flatten(chat, 'chat'),
  ...flatten(tools, 'tools'),
  ...flatten(onboarding, 'onboarding'),
};

export default messages;
