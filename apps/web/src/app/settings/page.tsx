import { BackupButton } from '../../components/settings/BackupButton';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">설정</h1>
      </header>

      <section className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            데이터 내보내기
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            모든 도메인(회사·시간블록·체크·회고·운동·세션·세트) 스냅샷을
            단일 JSON 파일로 다운로드합니다. 배포 후 정기적으로 로컬에 저장해
            두는 걸 권장.
          </p>
        </div>
        <BackupButton />
      </section>
    </div>
  );
}
