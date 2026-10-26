import '@fontsource-variable/onest/wght.css';
import '@fontsource-variable/unbounded/wght.css';
import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });
