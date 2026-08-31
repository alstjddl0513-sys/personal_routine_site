// Root monorepo package.json에서 버전 상수로 가져옴. 릴리스 시 root
// package.json의 version만 bump하면 UI에도 자동 반영. tsconfig의
// resolveJsonModule:true 덕분에 별도 설정 불필요.
import pkg from '../../../../package.json';

export const APP_VERSION = pkg.version as string;
