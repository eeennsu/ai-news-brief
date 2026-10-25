// 사용자에게 보이는 문구는 전부 여기에 둔다. 키는 entities의 판정·강도·보유 구분 값과 같다.
export const COPY = {
  today: {
    title: '오늘 브리핑',
    archiveLink: '지난 브리핑',
    emptyTitle: '오늘 브리핑 없음',
    emptyMessage: '오늘 브리핑이 아직 올라오지 않았다. 최근 브리핑을 볼 수 있다.',
    latestAction: '가장 최근 브리핑 보기',
  },
  archive: {
    title: '지난 브리핑',
    emptyTitle: '지난 브리핑 없음',
    emptyMessage: '아직 쌓인 브리핑이 없다. 첫 브리핑이 올라오면 여기에 날짜가 나온다.',
  },
  brief: {
    missingTitle: '이 날짜의 브리핑이 없다',
    missingMessage: '날짜를 잘못 골랐을 수 있다. 목록에서 다시 고른다.',
    invalidTitle: '열 수 없는 주소다',
    invalidMessage: '브리핑 날짜나 버전 정보가 올바르지 않다. 목록에서 다시 고른다.',
    archiveAction: '지난 브리핑 보기',
    noNews: '오늘은 기준에 맞는 새 뉴스가 없다',
    generatedAt: (time: string) => `${time} 생성`,
  },
  pushToken: {
    action: '푸시 토큰 보기',
    loadingLabel: '푸시 토큰을 받는 중',
    permissionDenied: '알림 권한이 없어 토큰을 받지 못했다. 설정에서 알림을 켠 뒤 다시 누른다',
    missingProjectId:
      '앱 설정에 프로젝트 ID가 없어 토큰을 받지 못했다. 설치용 빌드에서 다시 누른다',
    failed: '푸시 토큰을 받지 못했다. 인터넷 연결을 확인하고 다시 누른다',
  },
  loadingLabel: '불러오는 중',
  error: {
    title: '브리핑을 불러오지 못했다',
    message: '인터넷 연결을 확인하고 다시 시도한다.',
    retryAction: '다시 시도',
  },
  news: {
    openOriginal: '원문 보기',
    strength: (label: string) => `강도 ${label}`,
    verdict: { positive: '호재', negative: '악재', neutral: '중립' },
    strengthLabel: { weak: '약', medium: '중', strong: '강' },
    watch: { holding: '보유', interest: '관심' },
  },
} as const;
