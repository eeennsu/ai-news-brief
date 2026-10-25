import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// 라우팅 폴더(app/)에는 라우트 파일만 두므로 Next·Expo Router 모두 이 기본값을 쓴다.
// page·layout·route로 좁히면 not-found·error·sitemap 같은 라우트 파일의 default export가 막힌다.
const ROUTE_FILES = ['app/**/*.{ts,tsx}'];
// 생성기 산출물(shadcn은 function 선언을 쓴다), 빌드 결과, 테스트·스토리북·Expo 웹 산출물.
// `eslint .`가 이런 폴더까지 린트하면 커버리지를 한 번 돌린 뒤 `pnpm lint`가 실패한다.
// 새로 더한 것은 루트 기준이라 src 안의 같은 이름 폴더는 린트한다.
// dist·build는 android/app/build 같은 하위 산출물까지 빼되, src 안의 같은 이름 폴더(features/build 등)는 되살린다.
const GENERATED = [
  'src/shared/shadcn-ui/**',
  '**/dist/**',
  '**/build/**',
  '!src/**/dist/**',
  '!src/**/build/**',
  '**/.next/**',
  '**/.expo/**',
  'coverage/**',
  'storybook-static/**',
  'out/**',
  'web-build/**',
];

// no-restricted-syntax는 override에서 옵션을 주면 배열이 통째로 바뀐다. 그래서 selector를 묶음별로 두고
// override마다 풀 묶음만 뺀 배열로 다시 건다(restrict). 한 파일에 override가 둘 겹치면 마지막 것만 이기므로
// 겹치는 조합은 아래에서 따로 건다.
const SYNTAX = {
  functionExpression: [
    {
      selector: 'VariableDeclarator > FunctionExpression',
      message: '함수 선언 금지: `const f = function`이 아니라 화살표 함수를 쓴다.',
    },
    {
      selector: 'ExportDefaultDeclaration > FunctionDeclaration',
      message: '함수 선언 금지: `export default function`이 아니라 화살표 함수를 쓴다.',
    },
  ],
  defaultExport: [
    {
      selector: 'ExportDefaultDeclaration',
      message:
        'default export 금지: named export를 쓴다. 라우트 파일, *.config.*, *.d.ts, *.stories.*만 예외다.',
    },
    {
      selector: "ExportSpecifier[exported.name='default']",
      message:
        'default export 금지: named export를 쓴다. 라우트 파일, *.config.*, *.d.ts, *.stories.*만 예외다.',
    },
  ],
  enum: [
    {
      selector: 'TSEnumDeclaration',
      message: 'enum 금지: `as const` 객체에서 유니온을 뽑는다.',
    },
  ],
  asUnknownAs: [
    {
      // `as never as`도 같은 우회다. `as any as`는 no-explicit-any가 잡는다.
      selector:
        "TSAsExpression[expression.type='TSAsExpression'][expression.typeAnnotation.type=/^TS(Unknown|Never)Keyword$/]",
      message: '`as unknown as`·`as never as` 금지: 타입을 맞추거나 경계에서 zod로 파싱한다.',
    },
  ],
  env: [
    {
      selector: "MemberExpression[object.name='process'][property.name='env']",
      message: 'process.env 직접 접근 금지: shared/config의 env 모듈에서만 읽는다.',
    },
    {
      selector: "MemberExpression[object.name='process'][computed=true][property.value='env']",
      message: "process['env'] 직접 접근 금지: shared/config의 env 모듈에서만 읽는다.",
    },
    {
      selector:
        "VariableDeclarator[init.name='process'] > ObjectPattern > Property[key.name='env']",
      message: 'process에서 env 구조 분해 금지: shared/config의 env 모듈에서만 읽는다.',
    },
    {
      selector: "MemberExpression[object.type='MetaProperty'][property.name='env']",
      message: 'import.meta.env 직접 접근 금지: shared/config의 env 모듈에서만 읽는다.',
    },
  ],
};

const restrict = (...lifted) => [
  'error',
  ...Object.entries(SYNTAX)
    .filter(([group]) => !lifted.includes(group))
    .flatMap(([, selectors]) => selectors),
];

// 설정 파일 안에 두는 인라인 규칙: `TODO(태그):` 형식이 아닌 것을 잡는다.
// no-warning-comments는 `TODO(verify):`까지 잡아서 쓰지 못한다.
const local = {
  rules: {
    'todo-format': {
      meta: { type: 'problem', schema: [] },
      create: (context) => ({
        Program: () => {
          for (const comment of context.sourceCode.getAllComments()) {
            // `TODO.md` 같은 파일 이름은 표식이 아니다
            if (/\bTODO\b(?!\.\w|\([^)\s]+\):)/.test(comment.value)) {
              context.report({ loc: comment.loc, message: 'TODO는 `TODO(태그):` 형식으로 쓴다.' });
            }
          }
        },
      }),
    },
  },
};

// FSD 경계. 라우팅 폴더(app/)는 프로젝트 루트에, 레이어는 src/ 아래에 둔다(fsd.md 폴더 배치).
// pages 레이어는 웹이면 src/_pages, RN이면 src/screens다. 패턴을 루트부터 고정(partialMatch: false)한다.
// src/ 바로 아래의 파일(main.tsx, *.d.ts 등)은 진입 파일이다. element가 아니라 파일 범주(entry)로 둔다.
// 레이어 폴더도 진입 파일도 아닌 곳은 no-unknown-files가, 그곳을 가리키는 import는 no-unknown-dependencies가 잡는다.
const ELEMENTS = [
  { type: 'route', pattern: 'app' },
  { type: 'app', pattern: 'src/_app' },
  { type: 'pages', pattern: 'src/screens/*', capture: ['slice'] },
  { type: 'widgets', pattern: 'src/widgets/*', capture: ['slice'] },
  { type: 'features', pattern: 'src/features/*', capture: ['slice'] },
  { type: 'entities', pattern: 'src/entities/*', capture: ['slice'] },
  { type: 'shared', pattern: 'src/shared' },
].map((element) => ({ ...element, partialMatch: false }));

// 각 레이어가 import해도 되는 다른 레이어. 같은 레이어는 slice가 같을 때(내부 import)만 된다.
const IMPORTABLE = {
  route: ['app', 'pages'],
  app: ['pages', 'widgets', 'features', 'entities', 'shared'],
  pages: ['widgets', 'features', 'entities', 'shared'],
  widgets: ['features', 'entities', 'shared'],
  features: ['entities', 'shared'],
  entities: ['shared'],
  shared: [],
};
// slice가 있는 레이어. app과 shared는 slice가 없어 안쪽 파일까지 import한다.
const SLICED = ['pages', 'widgets', 'features', 'entities'];

// 진입 파일이 import할 수 있는 것은 app 레이어와 같다(app 레이어 자체도 포함). 라우팅 폴더는 안 된다.
// 다른 레이어는 진입 파일을 import하지 못한다.
const ENTRY_POLICIES = [
  {
    from: { file: { categories: 'entry' } },
    disallow: { to: { element: { type: 'route' } } },
    message:
      'FSD 레이어 방향 위반: 진입 파일 → {{to.element.types.[0]}} ({{dependency.source}}). 진입 파일은 라우팅 폴더를 import할 수 없다.',
  },
  {
    from: { element: { type: Object.keys(IMPORTABLE) } },
    disallow: { to: { file: { categories: 'entry' } } },
    message:
      'FSD 진입 파일 import 금지: {{from.element.types.[0]}} → 진입 파일 ({{dependency.source}}). src 바로 아래 파일은 어느 레이어도 import하지 않는다.',
  },
];

// 같은 파일이 여러 정책에 걸리면 마지막 정책의 메시지가 나온다. 일반적인 것부터 구체적인 것 순서로 둔다.
const POLICIES = [
  {
    disallow: { to: { element: { type: SLICED, fileInternalPath: '!index.{ts,tsx}' } } },
    message:
      'FSD 공개 API 우회: {{dependency.source}} ({{to.element.types.[0]}}/{{to.element.captured.slice}} 안쪽 파일). slice 루트 index.ts로 import한다.',
  },
  ...SLICED.map((layer) => ({
    from: { element: { type: layer } },
    disallow: { to: { element: { type: layer } } },
    message:
      'FSD 같은 레이어 import 금지: {{from.element.types.[0]}}/{{from.element.captured.slice}} → {{to.element.types.[0]}}/{{to.element.captured.slice}} ({{dependency.source}}). slice끼리 import하지 않는다. 공유할 코드는 아래 레이어로 내린다.',
  })),
  ...Object.entries(IMPORTABLE).map(([layer, importable]) => ({
    from: { element: { type: layer } },
    disallow: {
      to: {
        element: {
          type: Object.keys(IMPORTABLE).filter((to) => to !== layer && !importable.includes(to)),
        },
      },
    },
    message:
      'FSD 레이어 방향 위반: {{from.element.types.[0]}} → {{to.element.types.[0]}} ({{dependency.source}}). 위 레이어만 아래 레이어를 import한다.',
  })),
  {
    from: { element: { type: 'route' } },
    disallow: { to: { element: { type: ['widgets', 'features', 'entities', 'shared'] } } },
    message:
      'FSD 라우팅 폴더 위반: 라우팅 폴더(app/)는 pages·screens·app 레이어만 import한다 ({{dependency.source}}).',
  },
  ...ENTRY_POLICIES,
];

export default defineConfig(
  { ignores: GENERATED },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { local },
    rules: {
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',
      'no-restricted-syntax': restrict(),
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'local/todo-format': 'error',
    },
  },
  {
    files: ['app/**/*', 'src/**/*'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': ELEMENTS,
      'boundaries/files': [{ category: 'entry', pattern: 'src/*' }],
      'boundaries/include': ['app/**/*', 'src/**/*'],
      'boundaries/root-path': import.meta.dirname,
      'import/resolver': { typescript: { alwaysTryTypes: true } },
    },
    rules: {
      'boundaries/dependencies': ['error', { default: 'allow', policies: POLICIES }],
      'boundaries/no-unknown-files': 'error',
      'boundaries/no-unknown-dependencies': 'error',
    },
  },
  // override: 파일 범위별로 푸는 것
  { files: ROUTE_FILES, rules: { 'no-restricted-syntax': restrict('defaultExport') } },
  { files: ['**/*.stories.*'], rules: { 'no-restricted-syntax': restrict('defaultExport') } },
  {
    files: ['**/*.d.ts'],
    rules: {
      'no-restricted-syntax': restrict('defaultExport'),
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
  // node:test의 test()는 Promise를 돌려주지만 러너가 수집하므로 기다리지 않는다
  { files: ['scripts/**/*.test.mts'], rules: { '@typescript-eslint/no-floating-promises': 'off' } },
  { files: ['src/shared/config/**'], rules: { 'no-restricted-syntax': restrict('env') } },
  // scripts는 shared/config가 없어서 env 읽기를 이 모듈 하나에 모은다
  { files: ['scripts/lib/env.mts'], rules: { 'no-restricted-syntax': restrict('env') } },
  // 겹치는 조합: 위의 shared/config(env만 품)가 d.ts·stories의 default export 허용을 되돌리지 않게 한다
  {
    files: [
      ['src/shared/config/**', '**/*.d.ts'],
      ['src/shared/config/**', '**/*.stories.*'],
    ],
    rules: { 'no-restricted-syntax': restrict('defaultExport', 'env') },
  },
  { files: ['**/*.config.*'], rules: { 'no-restricted-syntax': restrict('defaultExport', 'env') } },
  // 설정·스크립트 파일은 tsconfig에 없어서 projectService가 파싱 에러를 낸다
  {
    files: ['**/*.{js,cjs,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  // .jsx는 기본 files(js·cjs·mjs)에도 typescript-eslint(ts 계열)에도 없어 아무 설정 없이 무시된다.
  // allowJs가 없으면 tsconfig에도 없으므로 타입 검사는 끈다.
  { files: ['**/*.jsx'], extends: [tseslint.configs.disableTypeChecked] },
  // metro.config.js·tailwind.config.js 같은 CommonJS 설정은 require()로 프리셋을 읽는다
  { files: ['**/*.{js,cjs}'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
  prettier,
);
