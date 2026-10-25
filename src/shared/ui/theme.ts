// 한국 증시 관례를 따른다: 호재는 빨강, 악재는 파랑. 강조색(accent)은 하나만 쓴다.
export const colors = {
  background: '#F6F7F8',
  surface: '#FFFFFF',
  text: '#15181C',
  textSub: '#5A616B',
  hairline: '#E1E4E8',
  skeleton: '#E3E6EA',
  accent: '#0B6B5D',
  accentSoft: '#E2F1EE',
  interestSoft: '#FFF3D4',
  interestText: '#7A5200',
  positive: '#C62828',
  negative: '#1565C0',
  neutral: '#5A616B',
  onAccent: '#FFFFFF',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 8, md: 12 } as const;
export const MIN_TOUCH = 44;
