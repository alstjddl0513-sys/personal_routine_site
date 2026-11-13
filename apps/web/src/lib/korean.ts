// 이름 뒤 조사 고르기 — "을(를)"처럼 기계적으로 보이지 않게 받침으로 골라 붙임.
// 끝의 문장부호 · 공백 · 따옴표는 건너뛰고 마지막 글자를 봄("차이는?" → '는').
// 마지막 글자가 한글이 아니면(영어 · 숫자) 받침을 알 수 없어 null — 부르는 쪽이 조사 없는 문장으로.

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const RIEUL = 8; // 종성 ㄹ — '로'는 ㄹ 받침 뒤에도 '로'

function lastHangul(word: string): number | null {
  const t = word.replace(/[\s\p{P}\p{S}]+$/u, '');
  const code = t.codePointAt(t.length - 1);
  if (code === undefined || code < HANGUL_START || code > HANGUL_END) return null;
  return (code - HANGUL_START) % 28; // 종성 번호, 0 = 받침 없음
}

/** 을/를 — 한글로 안 끝나면 null */
export function objectParticle(word: string): '을' | '를' | null {
  const jong = lastHangul(word);
  if (jong === null) return null;
  return jong === 0 ? '를' : '을';
}

/** 으로/로 — 한글로 안 끝나면 null */
export function directionParticle(word: string): '으로' | '로' | null {
  const jong = lastHangul(word);
  if (jong === null) return null;
  return jong === 0 || jong === RIEUL ? '로' : '으로';
}

/** 확인 창 제목 — "'이름'을 삭제할까요?" / 한글로 안 끝나면 "'name' 삭제할까요?" */
export function deleteConfirmTitle(name: string): string {
  const p = objectParticle(name);
  return p ? `'${name}'${p} 삭제할까요?` : `'${name}' 삭제할까요?`;
}
