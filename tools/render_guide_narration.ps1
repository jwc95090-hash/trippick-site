$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $projectRoot 'videos\guide\_narration-temp'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$scripts = @(
  @{
    Name = 'first-camp-essentials'
    Text = '첫 캠핑 준비물은 많이 사는 것보다 순서가 중요해요. 먼저 텐트, 매트, 침낭으로 편안한 잠자리를 준비하세요. 다음은 버너, 코펠, 물처럼 꼭 필요한 취사 장비만 챙겨요. 마지막으로 랜턴, 구급함, 보조 배터리를 확인하면 기본 준비는 끝입니다.'
  },
  @{
    Name = 'camping-manners'
    Text = '모두가 편안한 캠핑을 위해 매너타임을 지켜요. 밤 열 시가 되기 전 대화 소리와 음악, 조명 밝기를 낮춰주세요. 늦은 시간 차량 이동과 장비 정리는 최소화합니다. 개수대와 화장실은 다음 사람이 바로 사용할 수 있도록 깨끗하게 정리해요.'
  },
  @{
    Name = 'pet-camping-check'
    Text = '반려동물과 캠핑을 떠나기 전 동반 가능 구역과 추가 요금, 제한 조건을 확인하세요. 현장에서는 리드줄과 인식표를 착용하고 배변봉투를 준비합니다. 진드기 예방을 마치고, 뜨거운 바닥과 탈수를 피할 수 있는 그늘진 휴식 공간도 꼭 마련해 주세요.'
  },
  @{
    Name = 'camping-style-guide'
    Text = '차박은 설치가 빠르고 이동이 간편하지만 수납과 잠자리 공간이 제한적이에요. 오토캠핑은 준비 시간이 더 필요하지만 넓고 편안하게 머물 수 있습니다. 함께 가는 인원과 보유 장비, 화장실과 전기 같은 편의시설을 기준으로 나에게 맞는 방식을 선택하세요.'
  },
  @{
    Name = 'rain-camping-safety'
    Text = '우천 캠핑은 비의 양만 보지 말고 바람과 지형을 함께 확인해야 해요. 출발 전 시간대별 강수량과 순간 최대 풍속을 살펴보세요. 하천변과 낮은 지대, 배수가 나쁜 사이트는 피합니다. 천둥이나 강풍, 침수 징후가 보이면 계획보다 안전한 철수를 먼저 선택하세요.'
  }
)

Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speaker.SelectVoice('Microsoft Heami Desktop')
$speaker.Rate = 1
$speaker.Volume = 92

try {
  foreach ($item in $scripts) {
    $path = Join-Path $outputDir ($item.Name + '-raw.wav')
    $speaker.SetOutputToWaveFile($path)
    $speaker.Speak($item.Text)
    $speaker.SetOutputToNull()
    Write-Output ('Narration ready: ' + $item.Name)
  }
}
finally {
  $speaker.Dispose()
}
