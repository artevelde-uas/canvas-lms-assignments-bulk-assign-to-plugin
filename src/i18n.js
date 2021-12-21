import { addTranslations, getTranslator } from '@artevelde-uas/canvas-lms-app/services/i18n';


// Create a context with all the [lang].json file in the 'locale' directory
const context = require.context('../locales', false, /\.json$/);

// Build the translations object
const translations = Object.fromEntries(context.keys().map(key => [
    key.replace(/^\.\/(.+)\.json$/, '$1'),
    context(key)
]));

// Get the namespace from the package
const namespace = require('../package.json').name;

// Add all the translation files to the namespace
addTranslations(namespace, translations);

// Get the default translator for the namespace
const translator = getTranslator(namespace);


export default translator;
