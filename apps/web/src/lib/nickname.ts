// Client-side random nickname generator for the signup dice button.
// Adjective + noun + 3-digit number. Small lists — collisions are handled
// by the server-side uniqueness check, this just seeds the input.

const ADJECTIVES = [
  '느긋한', '재빠른', '조용한', '용감한', '차분한', '반짝이는',
  '든든한', '따뜻한', '단단한', '가벼운', '깔끔한', '엉뚱한',
  '유쾌한', '고요한', '똑똑한', '부드러운', '단호한', '수줍은',
];

const NOUNS = [
  '고양이', '판다', '수달', '너구리', '해달', '코알라',
  '햄스터', '펭귄', '카피바라', '올빼미', '알파카', '북극곰',
  '고슴도치', '토끼', '오리', '여우', '다람쥐', '거북이',
];

// Nickname format is [\p{L}\p{N}_]+ (2~20 chars). Adjective + noun 조합은
// 대부분 5~10자 사이, 뒤에 3자리 숫자 붙여 20자 이내 유지.
export function randomNickname(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 900) + 100; // 100~999
  return `${adj}${noun}${num}`;
}
