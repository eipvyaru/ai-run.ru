$ErrorActionPreference = 'Stop'
npm run db:migrate
npm run lint
npm run typecheck
npm test
npm run build
Write-Output 'Release verification passed'
