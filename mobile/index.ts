import { registerRootComponent } from 'expo';
import { initSentry } from './lib/sentry';
import App from './App';

initSentry();

registerRootComponent(App);
