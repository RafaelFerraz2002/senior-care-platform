import query from '@tanstack/eslint-plugin-query';
import reactHooks from 'eslint-plugin-react-hooks';

/** Acrescenta as regras de React (hooks e TanStack Query) às apps web e ao pacote de UI. */
export default [reactHooks.configs.flat.recommended, ...query.configs['flat/recommended']];
